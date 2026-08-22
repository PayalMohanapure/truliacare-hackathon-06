from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from db import get_db
from models import Request as RequestModel, Employee, EscalationLog
from schemas import EmployeeOut, StatusUpdate, AssignUpdate, EscalationOut, StatsOut
from escalation import ESCALATION_TARGET, evaluate_sla, enrich, TERMINAL

router = APIRouter()

ALLOWED_STATUSES = ["Pending", "In Progress", "Resolved", "Escalated", "Closed"]


@router.get("/employees", response_model=list[EmployeeOut])
def list_employees(role: Optional[str] = Query(default=None), db: Session = Depends(get_db)):
    q = db.query(Employee)
    if role:
        q = q.filter(Employee.role == role)
    return q.all()


@router.patch("/requests/{request_id}/status")
def update_status(
    request_id: int,
    payload: StatusUpdate,
    x_user_id: int = Header(1, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    row = db.get(RequestModel, request_id)
    if not row:
        raise HTTPException(404, f"Request {request_id} not found")

    previous = row.status
    row.status = payload.status
    row.updated_at = datetime.utcnow()

    if payload.status == "Escalated" and previous != "Escalated":
        actor = db.get(Employee, x_user_id)
        db.add(
            EscalationLog(
                request_id=row.id,
                from_status=previous,
                to_status="Escalated",
                reason=f"Manual escalation by {actor.name if actor else 'Admin'}",
                escalated_to=ESCALATION_TARGET.get(row.category, "Facility Admin"),
            )
        )

    db.commit()
    db.refresh(row)
    return enrich(row, db=db)


@router.patch("/requests/{request_id}/assign")
def assign_request(request_id: int, payload: AssignUpdate, db: Session = Depends(get_db)):
    row = db.get(RequestModel, request_id)
    if not row:
        raise HTTPException(404, f"Request {request_id} not found")

    if payload.assigned_to is not None:
        tech = db.get(Employee, payload.assigned_to)
        if not tech:
            raise HTTPException(404, f"Employee {payload.assigned_to} not found")
        if tech.role not in ("technician", "admin"):
            raise HTTPException(
                400,
                "assigned_to must reference an employee with role technician or admin",
            )
        if row.status == "Pending":
            row.status = "In Progress"

    row.assigned_to = payload.assigned_to
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return enrich(row, db=db)


@router.get("/escalations", response_model=list[EscalationOut])
def list_escalations(request_id: Optional[int] = Query(default=None), db: Session = Depends(get_db)):
    q = db.query(EscalationLog)
    if request_id is not None:
        q = q.filter(EscalationLog.request_id == request_id)
    logs = q.order_by(EscalationLog.created_at.desc()).all()

    requests_dict = {r.id: r for r in db.query(RequestModel).all()}
    return [
        {
            "id": log.id,
            "request_id": log.request_id,
            "request_title": requests_dict[log.request_id].title if log.request_id in requests_dict else "",
            "category": requests_dict[log.request_id].category if log.request_id in requests_dict else "",
            "from_status": log.from_status,
            "to_status": log.to_status,
            "reason": log.reason,
            "escalated_to": log.escalated_to,
            "created_at": log.created_at.isoformat(timespec="seconds") if isinstance(log.created_at, datetime) else str(log.created_at),
        }
        for log in logs
    ]


@router.get("/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)):
    open_requests = db.query(RequestModel).filter(~RequestModel.status.in_(TERMINAL)).all()
    evaluate_sla(db, open_requests)

    rows = db.query(RequestModel).all()
    n = lambda s: sum(1 for r in rows if r.status == s)
    total, esc = len(rows), n("Escalated")
    return {
        "total": total,
        "pending": n("Pending"),
        "in_progress": n("In Progress"),
        "resolved": n("Resolved"),
        "escalated": esc,
        "critical_open": sum(1 for r in rows if r.priority == "Critical" and r.status not in TERMINAL),
        "breached_open": sum(1 for r in rows if r.status == "Escalated" and r.status not in TERMINAL),
        "breach_rate_pct": round(esc / total * 100, 1) if total else 0.0,
    }
