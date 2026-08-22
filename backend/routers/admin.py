from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from db import get_db
from models import Request as RequestModel, Employee, EscalationLog
from schemas import EmployeeOut, RequestOut, StatusUpdate, AssignUpdate, EscalationOut, StatsOut
from escalation import CATEGORY_SLA, ESCALATION_TARGET, evaluate_sla, serialize_request, CLOSED_STATUSES

router = APIRouter(prefix="/api", tags=["admin"])

ALLOWED_STATUSES = ["Pending", "In Progress", "Resolved", "Escalated", "Closed"]


@router.get("/employees", response_model=list[EmployeeOut])
def list_employees(role: Optional[str] = Query(default=None), db: Session = Depends(get_db)):
    q = db.query(Employee)
    if role:
        q = q.filter(Employee.role == role)
    return q.all()


@router.patch("/requests/{request_id}/status", response_model=RequestOut)
def update_status(
    request_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    if payload.status not in ALLOWED_STATUSES:
        allowed = ", ".join(ALLOWED_STATUSES)
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Allowed: {allowed}",
        )

    row = db.query(RequestModel).filter(RequestModel.id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Request {request_id} not found")

    old_status = row.status
    row.status = payload.status
    row.updated_at = datetime.utcnow()

    if payload.status == "Escalated":
        actor = None
        if x_user_id is not None and x_user_id.strip().lstrip("-").isdigit():
            actor = db.query(Employee).filter(Employee.id == int(x_user_id)).first()
        actor_name = actor.name if actor else "unknown user"
        db.add(EscalationLog(
            request_id=row.id,
            from_status=old_status,
            to_status="Escalated",
            reason=f"Manual escalation by {actor_name}",
            escalated_to=ESCALATION_TARGET.get(row.category),
            created_at=row.updated_at,
        ))

    db.commit()
    db.refresh(row)
    return serialize_request(db, row)


@router.patch("/requests/{request_id}/assign", response_model=RequestOut)
def assign_request(request_id: int, payload: AssignUpdate, db: Session = Depends(get_db)):
    row = db.query(RequestModel).filter(RequestModel.id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Request {request_id} not found")

    if payload.assigned_to is not None:
        assignee = db.query(Employee).filter(Employee.id == payload.assigned_to).first()
        if not assignee:
            raise HTTPException(status_code=404, detail=f"Employee {payload.assigned_to} not found")
        if assignee.role not in ("technician", "admin"):
            raise HTTPException(
                status_code=400,
                detail="assigned_to must reference an employee with role technician or admin",
            )

    row.assigned_to = payload.assigned_to
    if row.status == "Pending" and payload.assigned_to is not None:
        row.status = "In Progress"
    row.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(row)
    return serialize_request(db, row)


@router.get("/escalations", response_model=list[EscalationOut])
def list_escalations(request_id: Optional[int] = Query(default=None), db: Session = Depends(get_db)):
    q = db.query(EscalationLog)
    if request_id is not None:
        q = q.filter(EscalationLog.request_id == request_id)
    logs = q.order_by(EscalationLog.created_at.desc()).all()

    titles = {r.id: r.title for r in db.query(RequestModel).all()}
    categories = {r.id: r.category for r in db.query(RequestModel).all()}
    return [
        {
            "id": log.id,
            "request_id": log.request_id,
            "request_title": titles.get(log.request_id, ""),
            "category": categories.get(log.request_id, ""),
            "from_status": log.from_status,
            "to_status": log.to_status,
            "reason": log.reason,
            "escalated_to": log.escalated_to,
            "created_at": log.created_at,
        }
        for log in logs
    ]


@router.get("/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)):
    rows = db.query(RequestModel).all()
    evaluate_sla(db, rows)
    rows = db.query(RequestModel).all()

    total = len(rows)
    pending = sum(1 for r in rows if r.status == "Pending")
    in_progress = sum(1 for r in rows if r.status == "In Progress")
    resolved = sum(1 for r in rows if r.status == "Resolved")
    escalated = sum(1 for r in rows if r.status == "Escalated")
    critical_open = sum(1 for r in rows if r.priority == "Critical" and r.status not in CLOSED_STATUSES)

    now = datetime.utcnow()

    def is_breached(r):
        age = int((now - r.created_at).total_seconds() // 60)
        return (r.sla_minutes - age) < 0 and r.status not in CLOSED_STATUSES

    breached_open = sum(1 for r in rows if is_breached(r))
    breach_rate_pct = round((escalated / total) * 100, 1) if total else 0.0

    return {
        "total": total,
        "pending": pending,
        "in_progress": in_progress,
        "resolved": resolved,
        "escalated": escalated,
        "critical_open": critical_open,
        "breached_open": breached_open,
        "breach_rate_pct": breach_rate_pct,
    }
