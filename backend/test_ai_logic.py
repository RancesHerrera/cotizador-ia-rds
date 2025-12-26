import sys
import os

# Add the current directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
import models, crud
from ai_service import AIService

def test_ai():
    db = SessionLocal()
    try:
        # 1. Create a dummy project and roles if they don't exist
        roles = crud.get_roles(db)
        if not roles:
            crud.create_role(db, type('obj', (object,), {'name': 'Backend Developer', 'hourly_rate': 50})())
            crud.create_role(db, type('obj', (object,), {'name': 'QA Engineer', 'hourly_rate': 40})())
            roles = crud.get_roles(db)
        
        role_ids = [r.id for r in roles]
        print(f"Roles available: {[r.name for r in roles]} with IDs {role_ids}")

        project = crud.create_project(db, type('obj', (object,), {'name': 'Test Project', 'client_name': 'Test Client', 'raw_requirements': 'Necesito una API con base de datos'})())
        quote = crud.create_quote(db, type('obj', (object,), {
            'project_id': project.id,
            'applied_margin': 0.2,
            'applied_risk': 0.1,
            'applied_tax': 0.16,
            'ai_raw_input': ''
        })())

        print(f"Testing AI with requirements: 'API con base de datos' and roles {role_ids}")
        items = AIService.generate_scope(db, project, quote.id, "API con base de datos", role_ids)
        
        print(f"Generated {len(items)} items:")
        for item in items:
            print(f" - [{item.role_id}] {item.description}: {item.manual_hours}h")

    finally:
        db.close()

if __name__ == "__main__":
    test_ai()
