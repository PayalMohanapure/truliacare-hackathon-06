# backend/schemas.py — OWNER: Dev 4
from typing import Literal, Optional
from pydantic import BaseModel, Field

Status   = Literal["Pending", "In Progress", "Resolved", "Escalated", "Closed"]
Priority = Literal["Low", "Medium", "High", "Critical"]


class RequestCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = ""
    category: str
    priority: Priority = "Medium"


class StatusUpdate(BaseModel):
    status: Status


class AssignUpdate(BaseModel):
    assigned_to: Optional[int] = None


class EmployeeOut(BaseModel):
    id: int
    name: str
    role: str
    department: Optional[str] = None
    model_config = {"from_attributes": True}

