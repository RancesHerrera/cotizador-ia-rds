from sqlalchemy.orm import Session
from typing import List
import os
import json
from openai import OpenAI
from dotenv import load_dotenv
import models, schemas, crud

# Load environment variables (.env)
load_dotenv()

# OpenAI Client Configuration (Compatible with OpenRouter)
api_key = os.getenv("OPENAI_API_KEY")
client = None
if api_key:
    client = OpenAI(
        api_key=api_key,
        base_url=os.getenv("OPENAI_BASE_URL")  # Use https://openrouter.ai/api/v1 for OpenRouter
    )
DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

class AIService:
    """
    AI Service that generates quote scope based on requirements and selected roles
    using OpenAI's GPT models.
    """

    @staticmethod
    def generate_scope(db: Session, project: models.Project, quote_id: int, requirements: str, role_ids: List[int]) -> List[models.QuoteItem]:
        print(f"DEBUG: Generating scope for Quote {quote_id} via OpenAI")
        
        # 1. Get all roles to match selected IDs
        all_roles = crud.get_roles(db)
        requested_ids = set(int(rid) for rid in role_ids)
        selected_roles = [r for r in all_roles if r.id in requested_ids]
        
        if not selected_roles:
            print("WARNING: No roles found matching requested IDs.")
            return []

        # Prepare context for the prompt
        roles_info = [{"id": r.id, "name": r.name} for r in selected_roles]
        
        system_prompt = """
        Eres un experto en arquitectura y estimación de software. Tu objetivo es transformar requerimientos detallados en un resumen ejecutivo de ALCANCE TÉCNICO.
        
        REGLAS DE ESTIMACIÓN (PUNTO MEDIO):
        1. No seas extremista: evita inflar horas pero tampoco des el mínimo teórico poco realista. Busca el "punto medio" profesional.
        2. AGREGACIÓN: No listes cada pequeño detalle como una línea separada. Agrupa requerimientos relacionados en "Funcionalidades Principales" o "Módulos" (ej. "Sistema de Autenticación y Perfiles" en lugar de 10 líneas de botones).
        3. El análisis debe ser PROFUNDO: Aunque el resultado sea un resumen de 5-8 puntos clave, las horas de cada punto deben reflejar TODO el detalle técnico del requerimiento analizado.
        4. Distribución por ROL: Asigna cada funcionalidad al rol más adecuado. Si una funcionalidad requiere varios roles, divídela solo lo necesario para mantener la claridad.
        
        FORMATO DE RESPUESTA (JSON):
           {"items": [{"role_id": int, "description": "Resumen de Funcionalidad", "hours": float}]}
        
        5. No incluyas texto fuera del JSON.
        6. Usa el idioma Español para las descripciones.
        7. Máximo 10-12 items totales para mantener el resumen legible.
        """
        
        user_prompt = f"""
        PROYECTO: {project.name}
        REQUERIMIENTOS DETALLADOS: 
        {requirements}
        
        ROLES DISPONIBLES (ID y Nombre): {json.dumps(roles_info)}
        
        Por favor, analiza todo el detalle anterior pero presenta un RESUMEN DE FUNCIONALIDADES clave con sus horas estimadas (punto medio).
        """

        try:
            if not client:
                raise ValueError("Cliente OpenAI no inicializado. Verifica OPENAI_API_KEY.")

            response = client.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            data = json.loads(content)
            suggested_tasks = data.get("items", [])
            
            print(f"DEBUG: OpenAI generated {len(suggested_tasks)} tasks.")

        except Exception as e:
            print(f"ERROR calling OpenAI: {e}")
            # Fallback simple logic if OpenAI fails
            suggested_tasks = []
            for role in selected_roles:
                suggested_tasks.append({
                    "role_id": role.id,
                    "description": f"Estimación base para {role.name} (Error AI: {str(e)[:50]})",
                    "hours": 8.0
                })

        # 2. Convert to QuoteItems and Persist
        created_items = []
        for idx, task in enumerate(suggested_tasks):
            # Basic validation to ensure role_id is valid
            rid = int(task.get('role_id', -1))
            if rid not in requested_ids:
                continue

            role = next((r for r in all_roles if r.id == rid), None)
            rate = role.hourly_rate if role else 0.0
            
            item_in = schemas.QuoteItemCreate(
                role_id=rid,
                description=task.get('description', 'Tarea sin descripción'),
                manual_hours=task.get('hours', 0.0),
                hourly_rate=rate,
                ai_suggested_hours=task.get('hours', 0.0),
                sequence=idx
            )
            created_item = crud.add_quote_item(db, quote_id, item_in)
            created_items.append(created_item)
            
        return created_items
