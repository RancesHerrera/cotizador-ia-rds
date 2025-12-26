from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas, crud
from database import SessionLocal, engine

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Cotizador IA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://localhost:4300"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"status": "ok", "app": "Cotizador IA v1"}

# --- Roles Endpoints ---
@app.post("/roles/", response_model=schemas.Role)
def create_role(role: schemas.RoleCreate, db: Session = Depends(get_db)):
    # Check if exists (simple version, could be in CRUD)
    db_role = db.query(models.Role).filter(models.Role.name == role.name).first()
    if db_role:
         raise HTTPException(status_code=400, detail="Role already registered")
    return crud.create_role(db=db, role=role)

@app.get("/roles/", response_model=List[schemas.Role])
def read_roles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    roles = crud.get_roles(db, skip=skip, limit=limit)
    return roles

@app.put("/roles/{role_id}", response_model=schemas.Role)
def update_role_endpoint(role_id: int, role: schemas.RoleCreate, db: Session = Depends(get_db)):
    db_role = crud.get_role(db, role_id)
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")
    return crud.update_role(db, role_id, role)

@app.delete("/roles/{role_id}")
def delete_role_endpoint(role_id: int, db: Session = Depends(get_db)):
    db_role = crud.get_role(db, role_id)
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")
    crud.delete_role(db, role_id)
    return {"ok": True}

# --- Config Endpoints ---
@app.post("/config/", response_model=schemas.SystemConfig)
def update_config(config: schemas.SystemConfigCreate, db: Session = Depends(get_db)):
    return crud.create_config(db=db, config=config)

@app.get("/config/", response_model=List[schemas.SystemConfig])
def read_config(db: Session = Depends(get_db)):
    return crud.get_all_configs(db)

# --- Core Endpoints ---

# Projects
@app.post("/projects/", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    return crud.create_project(db, project=project)

@app.put("/projects/{project_id}", response_model=schemas.Project)
def update_project(project_id: int, project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    res = crud.update_project(db, project_id, project)
    if not res:
        raise HTTPException(status_code=404, detail="Project not found")
    return res

@app.get("/projects/", response_model=List[schemas.Project])
def read_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_projects(db, skip=skip, limit=limit)

# Quotes
@app.post("/quotes/", response_model=schemas.Quote)
def create_quote(quote: schemas.QuoteCreate, db: Session = Depends(get_db)):
    return crud.create_quote(db, quote)

@app.get("/quotes/{quote_id}", response_model=schemas.Quote)
def read_quote(quote_id: int, db: Session = Depends(get_db)):
    # Fetch raw quote
    db_quote = crud.get_quote(db, quote_id)
    if not db_quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Fetch items
    items = crud.get_quote_items(db, quote_id)
    
    # PERFORM CALCULATION LOGIC HERE (Source of Truth) for Response
    # Total Cost = Sum(Item.manual_hours * Item.hourly_rate)
    # Total Price = (Total Cost * (1 + risk)) / (1 - margin) ... OR Cost + Margin + Risk?
    # User said: "Cálculos se basan en reglas". 
    # Standard software pricing often: Cost + Contingency = Base. Base / (1-Margin) = Price.
    # Let's use a simple additive model first, or verify user pref.
    # User Request: "subtotal, porcentajes, colchón, total".
    # Interpretation: 
    #   Subtotal (Cost) = Sum(hours * rate)
    #   Risk Amount = Subtotal * risk_percent
    #   CostBase = Subtotal + Risk Amount
    #   Price = CostBase / (1 - margin_percent)  <-- Standard Gross Margin formula
    #   Tax = Price * tax_percent
    #   Total with Tax = Price + Tax
    
    subtotal_cost = sum(item.manual_hours * item.hourly_rate for item in items)
    
    # Risk is typically a buffer on COST
    risk_amount = subtotal_cost * db_quote.applied_risk
    cost_base = subtotal_cost + risk_amount
    
    # Margin is typically Profit / Price.  Price = Cost / (1 - Margin)
    # Ensure margin < 1.0
    margin = db_quote.applied_margin
    if margin >= 1.0: margin = 0.99 # Safety
    
    if margin < 1.0 and margin >= 0:
        price_before_tax = cost_base / (1 - margin)
    else:
        price_before_tax = cost_base # No margin logic if invalid
        
    tax_amount = price_before_tax * db_quote.applied_tax
    total_final = price_before_tax + tax_amount
    
    response = schemas.Quote.model_validate(db_quote)
    response.items = items
    
    # Enrichment from Project
    project = db.query(models.Project).filter(models.Project.id == db_quote.project_id).first()
    if project:
        response.project_name = project.name
        response.client_name = project.client_name

    response.total_cost = round(subtotal_cost, 2)
    response.total_price = round(total_final, 2)
    
    return response

@app.post("/quotes/{quote_id}/items/", response_model=schemas.QuoteItem)
def create_quote_item(quote_id: int, item: schemas.QuoteItemCreate, db: Session = Depends(get_db)):
    return crud.add_quote_item(db, quote_id=quote_id, item=item)

@app.delete("/quotes/items/{item_id}")
def delete_quote_item(item_id: int, db: Session = Depends(get_db)):
    crud.delete_quote_item(db, item_id)
    return {"ok": True}

@app.put("/quotes/items/{item_id}", response_model=schemas.QuoteItem)
def update_quote_item(item_id: int, item: schemas.QuoteItemCreate, db: Session = Depends(get_db)):
    res = crud.update_quote_item(db, item_id, item)
    if not res:
        raise HTTPException(status_code=404, detail="Item not found")
    return res

@app.post("/projects/{project_id}/finalize")
def finalize_project(project_id: int, db: Session = Depends(get_db)):
    crud.update_project_status(db, project_id, "SENT")
    return {"status": "SENT"}

# --- AI Integration ---
from ai_service import AIService

@app.post("/quotes/{quote_id}/generate-scope", response_model=List[schemas.QuoteItem])
def generate_scope(quote_id: int, request: schemas.ScopeGenerateRequest, db: Session = Depends(get_db)):
    # 1. Get Project info via Quote
    db_quote = crud.get_quote(db, quote_id)
    if not db_quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    project = db.query(models.Project).filter(models.Project.id == db_quote.project_id).first()
    if not project:
         raise HTTPException(status_code=404, detail="Project not found")

    # 2. Call AI Service
    items = AIService.generate_scope(db, project, quote_id, request.requirements, request.role_ids)
    return items
