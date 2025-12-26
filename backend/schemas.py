from pydantic import BaseModel
from typing import Optional, List

# Role Schemas
class RoleBase(BaseModel):
    name: str
    hourly_rate: float

class RoleCreate(RoleBase):
    pass

class Role(RoleBase):
    id: int
    class Config:
        from_attributes = True

# SystemConfig Schemas
class SystemConfigBase(BaseModel):
    key: str
    value_text: Optional[str] = None
    value_float: Optional[float] = None

class SystemConfigCreate(SystemConfigBase):
    pass

class SystemConfig(SystemConfigBase):
    class Config:
        from_attributes = True

# --- Core Schemas ---

# Project
class ProjectBase(BaseModel):
    name: str
    client_name: str
    raw_requirements: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int
    status: str
    created_at: Optional[str] = None
    class Config:
        from_attributes = True

# QuoteItem
class QuoteItemBase(BaseModel):
    role_id: int
    description: str
    manual_hours: float
    hourly_rate: float
    ai_suggested_hours: Optional[float] = 0.0
    sequence: Optional[int] = 0

class QuoteItemCreate(QuoteItemBase):
    pass

class ScopeGenerateRequest(BaseModel):
    requirements: str
    role_ids: List[int]

class QuoteItem(QuoteItemBase):
    id: int
    quote_id: int
    class Config:
        from_attributes = True

# Quote
class QuoteBase(BaseModel):
    project_id: int
    applied_margin: Optional[float] = 0.0
    applied_risk: Optional[float] = 0.0
    applied_tax: Optional[float] = 0.0
    ai_raw_input: Optional[str] = None

class QuoteCreate(QuoteBase):
    pass

class Quote(QuoteBase):
    id: int
    items: List[QuoteItem] = []
    
    project_name: Optional[str] = None
    client_name: Optional[str] = None
    
    # Computed fields
    total_cost: Optional[float] = 0.0
    total_price: Optional[float] = 0.0
    
    class Config:
        from_attributes = True
