from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class EmployeeOut(BaseModel):
    id: int
    name: str
    role: str
    department: Optional[str] = None

    class Config:
        from_attributes = True


class RequestCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = ""
    category: str
    priority: Optional[str] = "Medium"


class StatusUpdate(BaseModel):
    status: str


class AssignUpdate(BaseModel):
    assigned_to: Optional[int] = None


class RequestOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    title: str
    description: Optional[str] = ""
    category: str
    priority: str
    status: str
    sla_minutes: int
    assigned_to: Optional[int] = None
    assigned_to_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    age_minutes: int
    minutes_remaining: int
    is_breached: bool


class EscalationOut(BaseModel):
    id: int
    request_id: int
    request_title: str
    category: str
    from_status: str
    to_status: str
    reason: str
    escalated_to: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StatsOut(BaseModel):
    total: int
    pending: int
    in_progress: int
    resolved: int
    escalated: int
    critical_open: int
    breached_open: int
    breach_rate_pct: float
