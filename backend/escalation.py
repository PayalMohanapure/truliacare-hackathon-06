# backend/escalation.py — OWNER: Dev 3
# The single source of truth for SLA. Nothing else in the codebase computes escalation.
from datetime import datetime
from sqlalchemy.orm import Session, object_session
from models import Request, EscalationLog, Employee

CATEGORY_SLA = {
    "Life Support":         5,
    "Oxygen Supply":        5,
    "Cold Chain / Vaccine": 10,
    "ER Power":             10,
    "IT / Network":         60,
    "Facilities / HVAC":    120,
}

ESCALATION_TARGET = {
    "Life Support":         "Biomedical On-Call — Suresh Kumar",
    "Oxygen Supply":        "Biomedical On-Call — Suresh Kumar",
    "Cold Chain / Vaccine": "Facility Admin — Vikram Nair",
    "ER Power":             "Electrical On-Call — Farah Sheikh",
    "IT / Network":         "Facility Admin — Vikram Nair",
    "Facilities / HVAC":    "Facility Admin — Vikram Nair",
}

TERMINAL = ("Resolved", "Closed")
CLOSED_STATUSES = TERMINAL

PRIORITY_RANK = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
PRIORITY_ORDER = PRIORITY_RANK


def age_minutes(row: Request) -> int:
    return int((datetime.utcnow() - row.created_at).total_seconds() // 60)


def evaluate_sla(db: Session, rows: list[Request]) -> list[Request]:
    """Flip newly-breached rows to Escalated and log it. Commits once.

    IDEMPOTENCY: 'Escalated' is in the skip set, so a row that is already
    escalated is never re-logged. Exactly one log row per transition.
    """
    changed = False
    now = datetime.utcnow()
    for row in rows:
        if row.status in TERMINAL or row.status == "Escalated":
            continue
        age = age_minutes(row)
        if age > row.sla_minutes:
            db.add(EscalationLog(
                request_id=row.id,
                from_status=row.status,
                to_status="Escalated",
                reason=(f"SLA breach — {age} min elapsed against a "
                        f"{row.sla_minutes} min SLA ({row.category})"),
                escalated_to=ESCALATION_TARGET.get(row.category, "Facility Admin"),
                created_at=now,
            ))
            row.status = "Escalated"
            row.updated_at = now
            changed = True
    if changed:
        db.commit()
        for row in rows:
            db.refresh(row)
    return rows


def enrich(row: Request, db: Session = None) -> dict:
    """ORM row -> the exact RequestOut dict. Every key, always present."""
    if db is None:
        db = object_session(row)

    age = age_minutes(row)
    remaining = row.sla_minutes - age

    emp_name = None
    assignee_name = None

    if hasattr(row, "employee") and row.employee:
        emp_name = row.employee.name
    elif db:
        emp = db.query(Employee).filter(Employee.id == row.employee_id).first()
        emp_name = emp.name if emp else None

    if hasattr(row, "assignee") and row.assignee:
        assignee_name = row.assignee.name
    elif db and row.assigned_to:
        asg = db.query(Employee).filter(Employee.id == row.assigned_to).first()
        assignee_name = asg.name if asg else None

    created_str = row.created_at.isoformat(timespec="seconds") if isinstance(row.created_at, datetime) else str(row.created_at)
    updated_str = row.updated_at.isoformat(timespec="seconds") if isinstance(row.updated_at, datetime) else str(row.updated_at)

    return {
        "id": row.id,
        "employee_id": row.employee_id,
        "employee_name": emp_name,
        "title": row.title,
        "description": row.description or "",
        "category": row.category,
        "priority": row.priority,
        "status": row.status,
        "sla_minutes": row.sla_minutes,
        "assigned_to": row.assigned_to,
        "assigned_to_name": assignee_name,
        "created_at": created_str,
        "updated_at": updated_str,
        "age_minutes": age,
        "minutes_remaining": remaining,
        "is_breached": remaining < 0 and row.status not in TERMINAL,
    }


def serialize_request(db: Session, r: Request) -> dict:
    return enrich(r, db=db)


def sort_rows(rows: list[Request]) -> list[Request]:
    """Breached first, then by priority, then oldest first."""
    return sorted(rows, key=lambda r: (
        not (r.sla_minutes - age_minutes(r) < 0 and r.status not in TERMINAL),
        PRIORITY_RANK.get(r.priority, 9),
        r.created_at,
    ))


sort_requests = sort_rows

