from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from db import get_db
from models import Request as RequestModel, Employee
from schemas import RequestCreate, RequestOut
from escalation import CATEGORY_SLA, evaluate_sla, serialize_request, sort_requests

router = APIRouter(prefix="/api/requests", tags=["requests"])


def require_user_id(x_user_id: Optional[str] = Header(default=None, alias="X-User-Id")) -> int:
    if x_user_id is None or not x_user_id.strip().lstrip("-").isdigit():
        raise HTTPException(status_code=400, detail="X-User-Id header is required")
    return int(x_user_id)


@router.post("", response_model=RequestOut, status_code=201)
def create_request(
    payload: RequestCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(require_user_id),
):
    if payload.category not in CATEGORY_SLA:
        allowed = ", ".join(CATEGORY_SLA.keys())
        raise HTTPException(
            status_code=400,
            detail=f"Unknown category '{payload.category}'. Allowed: {allowed}",
        )

    employee = db.query(Employee).filter(Employee.id == user_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail=f"Employee {user_id} not found")

    now = datetime.utcnow()
    row = RequestModel(
        employee_id=user_id,
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
    return serialize_request(db, row)


@router.get("", response_model=list[RequestOut])
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
    rows = sort_requests(rows)
    return [serialize_request(db, r) for r in rows]


@router.get("/{request_id}", response_model=RequestOut)
def get_request(request_id: int, db: Session = Depends(get_db)):
    row = db.query(RequestModel).filter(RequestModel.id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Request {request_id} not found")
    evaluate_sla(db, [row])
    return serialize_request(db, row)


@router.post("/{request_id}/age", response_model=RequestOut)
def age_request(
    request_id: int,
    minutes: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    if minutes is None or minutes < 1 or minutes > 10080:
        raise HTTPException(status_code=400, detail="minutes must be between 1 and 10080")

    row = db.query(RequestModel).filter(RequestModel.id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Request {request_id} not found")

    row.created_at = row.created_at - timedelta(minutes=minutes)
    db.commit()
    db.refresh(row)

    evaluate_sla(db, [row])
    return serialize_request(db, row)
