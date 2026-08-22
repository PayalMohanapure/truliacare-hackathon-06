# backend/routers/ai.py — AI agent endpoints
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from db import get_db
from models import Employee
from agent import analyze_request, suggest_assignee, suggest_escalation, chat

router = APIRouter()


class AnalyzeRequest(BaseModel):
    description: str


class AssignRequest(BaseModel):
    category: str
    priority: str


class EscalateRequest(BaseModel):
    id: int
    title: str
    category: str
    priority: str
    status: str
    age_minutes: int
    sla_minutes: int
    minutes_remaining: int


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None


@router.post("/ai/analyze")
def ai_analyze(payload: AnalyzeRequest):
    """Employee types plain English → AI returns category, priority, title."""
    if not payload.description or len(payload.description.strip()) < 5:
        raise HTTPException(400, "Description too short")
    try:
        return analyze_request(payload.description)
    except Exception as e:
        raise HTTPException(500, f"AI error: {str(e)}")


@router.post("/ai/suggest-assignee")
def ai_suggest_assignee(payload: AssignRequest, db: Session = Depends(get_db)):
    """AI picks best technician for a request."""
    technicians = db.query(Employee).filter(
        Employee.role.in_(["technician", "admin"])
    ).all()
    tech_list = [{"id": t.id, "name": t.name, "role": t.role, "department": t.department} for t in technicians]
    try:
        return suggest_assignee(payload.category, payload.priority, tech_list)
    except Exception as e:
        raise HTTPException(500, f"AI error: {str(e)}")


@router.post("/ai/suggest-escalation")
def ai_suggest_escalation(payload: EscalateRequest):
    """AI suggests escalation message for a breached ticket."""
    try:
        return suggest_escalation(payload.dict())
    except Exception as e:
        raise HTTPException(500, f"AI error: {str(e)}")


@router.post("/ai/chat")
def ai_chat(payload: ChatRequest):
    """General AI chat assistant."""
    if not payload.message or len(payload.message.strip()) < 2:
        raise HTTPException(400, "Message too short")
    try:
        return chat(payload.message, payload.context)
    except Exception as e:
        raise HTTPException(500, f"AI error: {str(e)}")
