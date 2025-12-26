from sqlalchemy import Column, Integer, String, Float
from database import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # e.g., "Senior Backend Dev"
    hourly_rate = Column(Float) # e.g., 50.0

class SystemConfig(Base):
    __tablename__ = "system_config"

    key = Column(String, primary_key=True, index=True) # e.g., "default_margin"
    value_text = Column(String, nullable=True) 
    value_float = Column(Float, nullable=True) # e.g., 0.20

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    client_name = Column(String)
    status = Column(String, default="DRAFT") # DRAFT, SENT, ACCEPTED, REJECTED
    raw_requirements = Column(String, nullable=True)
    
class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True) # Logic FK, SQLite no enforce by default unless configured
    
    # Financial Snapshots
    applied_margin = Column(Float, default=0.0)
    applied_risk = Column(Float, default=0.0)
    applied_tax = Column(Float, default=0.0)
    
    # AI Context
    ai_raw_input = Column(String, nullable=True)

class QuoteItem(Base):
    __tablename__ = "quote_items"

    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, index=True)
    role_id = Column(Integer)
    
    description = Column(String)
    ai_suggested_hours = Column(Float, default=0.0)
    manual_hours = Column(Float, default=0.0)
    
    # Note: We don't store hourly_rate here to allow dynamic updates OR we snapshot it.
    # For MVP, we'll store logic in frontend calculation, but safer to snapshot rate here?
    # Let's keep it simple: Real-time calculation based on Role ID current rate OR snapshot.
    # User requirement: "Mantenimiento define valores... se muestran y se pueden ajustar".
    # Decision: Snapshotting rate in Item is safer for history, but for MVP we might pull from Role.
    # WAIT: User wants "Tabla editable... editar horas por rol (y opcionalmente tarifa)".
    # So we MUST store the rate in the item to allow override.
    hourly_rate = Column(Float, default=0.0)
    sequence = Column(Integer, default=0)
