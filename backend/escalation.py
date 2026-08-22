from datetime import datetime, timezone
from sqlalchemy.orm import Session
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

CLOSED_STATUSES = ("Resolved", "Closed")

PRIORITY_ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}


def _now():
    return datetime.utcnow()


def evaluate_sla(db: Session, rows: list[Request]) -> None:
    """Compute-on-read escalation. Mutates rows in place and writes exactly
    one escalation_logs row per Pending/In Progress -> Escalated transition."""
    now = _now()
    dirty = False
    for r in rows:
        if r.status in CLOSED_STATUSES or r.status == "Escalated":
            continue
        age_minutes = int((now - r.created_at).total_seconds() // 60)
        if age_minutes > r.sla_minutes:
            old_status = r.status
            r.status = "Escalated"
            r.updated_at = now
            db.add(EscalationLog(
                request_id=r.id,
                from_status=old_status,
                to_status="Escalated",
                reason=f"SLA breach — {age_minutes} min elapsed against a {r.sla_minutes} min SLA ({r.category})",
                escalated_to=ESCALATION_TARGET.get(r.category),
                created_at=now,
            ))
            dirty = True
    if dirty:
        db.commit()
        for r in rows:
            db.refresh(r)


def serialize_request(db: Session, r: Request) -> dict:
    now = _now()
    age_minutes = int((now - r.created_at).total_seconds() // 60)
    minutes_remaining = r.sla_minutes - age_minutes
    is_breached = minutes_remaining < 0 and r.status not in CLOSED_STATUSES

    employee = db.query(Employee).filter(Employee.id == r.employee_id).first()
    assignee = db.query(Employee).filter(Employee.id == r.assigned_to).first() if r.assigned_to else None

    return {
        "id": r.id,
        "employee_id": r.employee_id,
        "employee_name": employee.name if employee else None,
        "title": r.title,
        "description": r.description or "",
        "category": r.category,
        "priority": r.priority,
        "status": r.status,
        "sla_minutes": r.sla_minutes,
        "assigned_to": r.assigned_to,
        "assigned_to_name": assignee.name if assignee else None,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
        "age_minutes": age_minutes,
        "minutes_remaining": minutes_remaining,
        "is_breached": is_breached,
    }


def sort_requests(rows: list[Request]) -> list[Request]:
    now = _now()

    def key(r: Request):
        age_minutes = int((now - r.created_at).total_seconds() // 60)
        minutes_remaining = r.sla_minutes - age_minutes
        is_breached = minutes_remaining < 0 and r.status not in CLOSED_STATUSES
        return (
            0 if is_breached else 1,
            PRIORITY_ORDER.get(r.priority, 4),
            r.created_at,
        )

    return sorted(rows, key=key)
