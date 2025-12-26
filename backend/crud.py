from sqlalchemy.orm import Session
import models, schemas

# Role CRUD
def get_role(db: Session, role_id: int):
    return db.query(models.Role).filter(models.Role.id == role_id).first()

def get_roles(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Role).offset(skip).limit(limit).all()

def create_role(db: Session, role: schemas.RoleCreate):
    db_role = models.Role(name=role.name, hourly_rate=role.hourly_rate)
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role

def update_role(db: Session, role_id: int, role: schemas.RoleCreate):
    db_role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if db_role:
        db_role.name = role.name
        db_role.hourly_rate = role.hourly_rate
        db.commit()
        db.refresh(db_role)
    return db_role

def delete_role(db: Session, role_id: int):
    db_role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if db_role:
        db.delete(db_role)
        db.commit()

# SystemConfig CRUD
def get_config(db: Session, key: str):
    return db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()

def create_config(db: Session, config: schemas.SystemConfigCreate):
    # Upsert logic
    existing = get_config(db, config.key)
    if existing:
        existing.value_text = config.value_text
        existing.value_float = config.value_float
        db.commit()
        db.refresh(existing)
        return existing
    
    db_config = models.SystemConfig(key=config.key, value_text=config.value_text, value_float=config.value_float)
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

def get_all_configs(db: Session):
    return db.query(models.SystemConfig).all()

# --- Core CRUD ---
def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = models.Project(
        name=project.name, 
        client_name=project.client_name,
        raw_requirements=project.raw_requirements,
        status="DRAFT"
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def update_project(db: Session, project_id: int, project: schemas.ProjectCreate):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if db_project:
        db_project.name = project.name
        db_project.client_name = project.client_name
        db.commit()
        db.refresh(db_project)
    return db_project

def get_projects(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Project).offset(skip).limit(limit).all()

def update_project_status(db: Session, project_id: int, status: str):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if db_project:
        db_project.status = status
        db.commit()
        db.refresh(db_project)
    return db_project

def create_quote(db: Session, quote: schemas.QuoteCreate):
    # Initialize with provided values or defaults (defaults could be fetched from Config here if not provided, 
    # but let's assume Frontend provides them or they are 0.0 initially)
    db_quote = models.Quote(
        project_id=quote.project_id,
        applied_margin=quote.applied_margin,
        applied_risk=quote.applied_risk,
        applied_tax=quote.applied_tax,
        ai_raw_input=quote.ai_raw_input
    )
    db.add(db_quote)
    db.commit()
    db.refresh(db_quote)
    return db_quote

def get_quote(db: Session, quote_id: int):
    return db.query(models.Quote).filter(models.Quote.id == quote_id).first()

def add_quote_item(db: Session, quote_id: int, item: schemas.QuoteItemCreate):
    db_item = models.QuoteItem(
        quote_id=quote_id,
        role_id=item.role_id,
        description=item.description,
        manual_hours=item.manual_hours,
        hourly_rate=item.hourly_rate,
        ai_suggested_hours=item.ai_suggested_hours,
        sequence=item.sequence or 0
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def get_quote_items(db: Session, quote_id: int):
    return db.query(models.QuoteItem).filter(models.QuoteItem.quote_id == quote_id).order_by(models.QuoteItem.sequence, models.QuoteItem.id).all()

def update_quote_item(db: Session, item_id: int, item: schemas.QuoteItemCreate):
    db_item = db.query(models.QuoteItem).filter(models.QuoteItem.id == item_id).first()
    if db_item:
        db_item.role_id = item.role_id
        db_item.description = item.description
        db_item.manual_hours = item.manual_hours
        db_item.hourly_rate = item.hourly_rate
        db_item.sequence = item.sequence
        db.commit()
        db.refresh(db_item)
    return db_item

def update_quote_financials(db: Session, quote_id: int, margin: float, risk: float, tax: float):
    db_quote = get_quote(db, quote_id)
    if db_quote:
        db_quote.applied_margin = margin
        db_quote.applied_risk = risk
        db_quote.applied_tax = tax
        db.commit()
        db.refresh(db_quote)
    return db_quote

def delete_quote_item(db: Session, item_id: int):
    db_item = db.query(models.QuoteItem).filter(models.QuoteItem.id == item_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
    return db_item
