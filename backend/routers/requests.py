# backend/routers/requests.py — OWNER: Dev 3
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from db import get_db
from models import Request as RequestModel, Employee
from schemas import RequestCreate
from escalation import CATEGORY_SLA, evaluate_sla, enrich, sort_rows, try_backup_swap

router = APIRouter()


@router.post("/requests", status_code=201)
def create_request(
    payload: RequestCreate,
    x_user_id: int = Header(..., alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    if payload.category not in CATEGORY_SLA:
        raise HTTPException(400, f"Unknown category '{payload.category}'. "
                                 f"Allowed: {', '.join(CATEGORY_SLA)}")
    if not db.get(Employee, x_user_id):
        raise HTTPException(404, f"Employee {x_user_id} not found")

    now = datetime.utcnow()
    row = RequestModel(
        employee_id=x_user_id,
        title=payload.title,
        description=payload.description or "",
        category=payload.category,
        priority=payload.priority or "Medium",
        status="Pending",
        sla_minutes=CATEGORY_SLA[payload.category],
        assigned_to=None,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    if try_backup_swap(db, row, reason=f"Backup unit assigned at intake for {row.category}"):
        db.commit()
        db.refresh(row)

    return enrich(row)


@router.get("/requests")
def list_requests(
    status: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    employee_id: Optional[int] = Query(default=None),
    assigned_to: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(RequestModel)
    if status:
        q = q.filter(RequestModel.status == status)
    if category:
        q = q.filter(RequestModel.category == category)
    if employee_id is not None:
        q = q.filter(RequestModel.employee_id == employee_id)
    if assigned_to is not None:
        q = q.filter(RequestModel.assigned_to == assigned_to)
    rows = q.all()
    evaluate_sla(db, rows)
    rows = sort_rows(rows)
    return [enrich(r) for r in rows]


@router.get("/requests/{request_id}")
def get_request(request_id: int, db: Session = Depends(get_db)):
    row = db.get(RequestModel, request_id)
    if not row:
        raise HTTPException(404, f"Request {request_id} not found")
    evaluate_sla(db, [row])
    return enrich(row)


@router.post("/requests/{request_id}/age")
def age_request(
    request_id: int,
    minutes: int = Query(..., ge=1, le=10080, description="Backdate created_at by N minutes"),
    db: Session = Depends(get_db),
):
    row = db.get(RequestModel, request_id)
    if not row:
        raise HTTPException(404, f"Request {request_id} not found")
    row.created_at = row.created_at - timedelta(minutes=minutes)
    db.commit()
    evaluate_sla(db, [row])
    db.refresh(row)
    return enrich(row)
