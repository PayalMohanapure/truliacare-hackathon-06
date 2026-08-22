from datetime import datetime, timezone
from sqlalchemy.orm import Session, object_session
from models import Request, EscalationLog, Employee

CATEGORY_SLA = {
    "Life Support": 5,
    "Oxygen Supply": 5,
    "Cold Chain / Vaccine": 10,
    "ER Power": 10,
    "IT / Network": 60,
    "Facilities / HVAC": 120,
}

ESCALATION_TARGET = {
    "Life Support": "Biomedical On-Call — Suresh Kumar",
    "Oxygen Supply": "Biomedical On-Call — Suresh Kumar",
    "Cold Chain / Vaccine": "Facility Admin — Vikram Nair",
    "ER Power": "Electrical On-Call — Farah Sheikh",
    "IT / Network": "Facility Admin — Vikram Nair",
    "Facilities / HVAC": "Facility Admin — Vikram Nair",
}

TERMINAL = ("Resolved", "Closed")
CLOSED_STATUSES = TERMINAL

PRIORITY_ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
PRIORITY_RANK = PRIORITY_ORDER


def _now():
    return datetime.utcnow()


def age_minutes(row: Request) -> int:
    return int((datetime.utcnow() - row.created_at).total_seconds() // 60)


def evaluate_sla(db: Session, rows: list[Request]) -> list[Request]:
    """Compute-on-read escalation. Mutates rows in place and writes exactly
    one escalation_logs row per Pending/In Progress -> Escalated transition."""
    now = _now()
    dirty = False
    for r in rows:
        if r.status in TERMINAL or r.status == "Escalated":
            continue
        age = age_minutes(r)
        if age > r.sla_minutes:
            old_status = r.status
            r.status = "Escalated"
            r.updated_at = now
            db.add(EscalationLog(
                request_id=r.id,
                from_status=old_status,
                to_status="Escalated",
                reason=f"SLA breach — {age} min elapsed against a {r.sla_minutes} min SLA ({r.category})",
                escalated_to=ESCALATION_TARGET.get(r.category, "Facility Admin"),
                created_at=now,
            ))
            dirty = True
    if dirty:
        db.commit()
        for r in rows:
            db.refresh(r)
    return rows


def enrich(row: Request, db: Session = None) -> dict:
    """ORM row -> exact RequestOut dict. Every key present, ISO string dates."""
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


def sort_requests(rows: list[Request]) -> list[Request]:
    def key(r: Request):
        age = age_minutes(r)
        remaining = r.sla_minutes - age
        is_breached = remaining < 0 and r.status not in TERMINAL
        return (
            0 if is_breached else 1,
            PRIORITY_ORDER.get(r.priority, 4),
            r.created_at,
        )

    return sorted(rows, key=key)


sort_rows = sort_requests

