# backend/escalation.py — OWNER: Dev 3
# The single source of truth for SLA. Nothing else in the codebase computes escalation.
from datetime import datetime
from sqlalchemy.orm import Session
from models import Request, EscalationLog, Equipment, SwapLog

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
PRIORITY_RANK = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}

# Categories where a spare unit can safely stand in for a damaged one — life
# safety equipment only. Everything else still escalates on SLA breach.
CRITICAL_SWAP_CATEGORIES = {"Life Support", "Oxygen Supply", "Cold Chain / Vaccine"}


def age_minutes(row: Request) -> int:
    return int((datetime.utcnow() - row.created_at).total_seconds() // 60)


def try_backup_swap(db: Session, row: Request, reason: str) -> bool:
    """If a spare unit exists for row's category, assign it and mark the
    damaged unit as under repair instead of letting the request escalate.
    Returns True if a swap happened."""
    if row.category not in CRITICAL_SWAP_CATEGORIES:
        return False

    spare = (
        db.query(Equipment)
        .filter(Equipment.category == row.category, Equipment.status == "Spare")
        .first()
    )
    if not spare:
        return False

    damaged = db.query(Equipment).filter(Equipment.id == row.equipment_id).first() if row.equipment_id else None

    now = datetime.utcnow()
    spare.status = "Active"
    if damaged:
        damaged.status = "In Repair"

    row.equipment_id = spare.id
    row.status = "In Progress"
    row.updated_at = now

    db.add(SwapLog(
        request_id=row.id,
        damaged_equipment_id=damaged.id if damaged else spare.id,
        spare_equipment_id=spare.id,
        reason=reason,
        created_at=now,
    ))
    return True


def evaluate_sla(db: Session, rows: list[Request]) -> list[Request]:
    """Flip newly-breached rows to Escalated and log it. Commits once.

    Before escalating a breached critical-category request, tries a backup
    equipment swap instead — see try_backup_swap().

    IDEMPOTENCY: 'Escalated' is in the skip set, so a row that is already
    escalated is never re-logged. Exactly one log row per transition.
    Remove that guard and the timeline fills with duplicates in 30 seconds.
    """
    changed = False
    now = datetime.utcnow()
    for row in rows:
        if row.status in TERMINAL or row.status == "Escalated":
            continue
        age = int((now - row.created_at).total_seconds() // 60)
        if age > row.sla_minutes:
            reason = (f"SLA breach — {age} min elapsed against a "
                      f"{row.sla_minutes} min SLA ({row.category})")
            if try_backup_swap(db, row, reason=f"{reason} — backup unit assigned in place of escalation"):
                changed = True
                continue
            db.add(EscalationLog(
                request_id=row.id,
                from_status=row.status,
                to_status="Escalated",
                reason=reason,
                escalated_to=ESCALATION_TARGET.get(row.category, "Facility Admin"),
            ))
            row.status = "Escalated"
            row.updated_at = now
            changed = True
    if changed:
        db.commit()
        for row in rows:
            db.refresh(row)
    return rows


def enrich(row: Request) -> dict:
    """ORM row → the exact RequestOut dict. Every key, always present."""
    age = age_minutes(row)
    remaining = row.sla_minutes - age
    equipment = row.equipment if row.equipment_id else None
    return {
        "id": row.id,
        "employee_id": row.employee_id,
        "employee_name": row.employee.name if row.employee else None,
        "title": row.title,
        "description": row.description or "",
        "category": row.category,
        "priority": row.priority,
        "status": row.status,
        "sla_minutes": row.sla_minutes,
        "assigned_to": row.assigned_to,
        "assigned_to_name": row.assignee.name if row.assignee else None,
        "equipment_id": row.equipment_id,
        "equipment_label": equipment.label if equipment else None,
        "created_at": row.created_at.isoformat(timespec="seconds"),
        "updated_at": row.updated_at.isoformat(timespec="seconds"),
        "age_minutes": age,
        "minutes_remaining": remaining,
        "is_breached": remaining < 0 and row.status not in TERMINAL,
    }


def sort_rows(rows: list[Request]) -> list[Request]:
    """Breached first, then by priority, then oldest first."""
    return sorted(rows, key=lambda r: (
        not (r.sla_minutes - age_minutes(r) < 0 and r.status not in TERMINAL),
        PRIORITY_RANK.get(r.priority, 9),
        r.created_at,
    ))
