from datetime import datetime, timedelta

from db import Base, engine, SessionLocal
import models
from models import Employee, Request, EscalationLog, Equipment, SwapLog

Base.metadata.create_all(bind=engine)

db = SessionLocal()

db.query(SwapLog).delete()
db.query(EscalationLog).delete()
db.query(Request).delete()
db.query(Equipment).delete()
db.query(Employee).delete()
db.commit()

EMPLOYEES = [
    dict(id=1, name="Dr. Anita Rao", role="admin", department="Hospital Administration"),
    dict(id=2, name="Vikram Nair", role="admin", department="Facility Management"),
    dict(id=3, name="Suresh Kumar", role="technician", department="Biomedical Engineering"),
    dict(id=4, name="Farah Sheikh", role="technician", department="Electrical & HVAC"),
    dict(id=5, name="Priya Menon", role="employee", department="ICU — Ward 3"),
    dict(id=6, name="Rahul Das", role="employee", department="Pathology Lab"),
]
for e in EMPLOYEES:
    db.add(Employee(**e))
db.commit()

now = datetime.utcnow()


def ago(mins):
    return now - timedelta(minutes=mins)


EQUIPMENT = [
    dict(id=1, category="Life Support", label="Ventilator VT-04", status="Damaged", department="ICU — Ward 3"),
    dict(id=2, category="Life Support", label="Ventilator VT-09 (Spare)", status="Spare", department="Biomedical Store"),
    dict(id=3, category="Oxygen Supply", label="O2 Manifold — Ward 3", status="Damaged", department="ICU — Ward 3"),
    dict(id=4, category="Oxygen Supply", label="O2 Manifold — Spare Unit", status="Spare", department="Biomedical Store"),
    dict(id=5, category="Cold Chain / Vaccine", label="Vaccine Fridge #2", status="Damaged", department="Pathology Lab"),
    dict(id=6, category="Cold Chain / Vaccine", label="Vaccine Fridge #5 (Spare)", status="Spare", department="Biomedical Store"),
]
for eq in EQUIPMENT:
    db.add(Equipment(**eq))
db.commit()

REQUESTS = [
    dict(id=1, employee_id=5, title="ICU Bed 4 ventilator alarm — low tidal volume",
         description="Continuous low tidal volume alarm on Bed 4. Patient is vent-dependent.",
         category="Life Support", priority="Critical", status="Escalated",
         sla_minutes=5, assigned_to=3, equipment_id=1, age=22),
    dict(id=2, employee_id=6, title="Vaccine fridge #2 temperature drift — reading +8°C",
         description="Cold chain unit 2 holding at +8°C against a +2 to +8 spec ceiling. ~400 doses at risk.",
         category="Cold Chain / Vaccine", priority="Critical", status="Escalated",
         sla_minutes=10, assigned_to=None, equipment_id=5, age=35),
    dict(id=3, employee_id=5, title="ER backup generator fails auto-transfer test",
         description="Weekly ATS test did not transfer load. ER on utility power only.",
         category="ER Power", priority="Critical", status="In Progress",
         sla_minutes=10, assigned_to=4, age=6),
    dict(id=4, employee_id=5, title="Central oxygen manifold pressure dropping in Ward 3",
         description="Line pressure 2.8 bar against a 4.0 bar spec. Two patients on O2.",
         category="Oxygen Supply", priority="Critical", status="Pending",
         sla_minutes=5, assigned_to=None, equipment_id=3, age=1),
    dict(id=5, employee_id=5, title="OT-2 surgical lighting flickers mid-procedure",
         description="Overhead surgical lamp in Operating Theatre 2 flickering under load.",
         category="Facilities / HVAC", priority="High", status="In Progress",
         sla_minutes=120, assigned_to=4, age=40),
    dict(id=6, employee_id=6, title="Nurse station Wi-Fi down — EMR unreachable",
         description="Ward 3 nurse station cannot reach the EMR. Charting on paper.",
         category="IT / Network", priority="High", status="Pending",
         sla_minutes=60, assigned_to=None, age=15),
    dict(id=7, employee_id=6, title="Pathology lab HVAC not holding 18°C",
         description="Lab ambient at 26°C. Analyser calibration drifting.",
         category="Facilities / HVAC", priority="Medium", status="In Progress",
         sla_minutes=120, assigned_to=4, age=90),
    dict(id=8, employee_id=5, title="Infusion pump #7 battery not holding charge",
         description="Pump drops to mains-only within 4 minutes of unplugging.",
         category="Life Support", priority="High", status="Resolved",
         sla_minutes=5, assigned_to=3, age=180),
    dict(id=9, employee_id=6, title="Blood bank fridge door seal worn",
         description="Gasket on blood bank unit 1 no longer seating. Condensation on inner wall.",
         category="Cold Chain / Vaccine", priority="Medium", status="Resolved",
         sla_minutes=10, assigned_to=3, age=240),
    dict(id=10, employee_id=6, title="Radiology PACS workstation will not boot",
         description="Reporting workstation 2 stuck on POST. Radiologist queue backing up.",
         category="IT / Network", priority="Medium", status="Pending",
         sla_minutes=60, assigned_to=None, age=30),
    dict(id=11, employee_id=5, title="ICU ceiling AC unit leaking near monitor cart",
         description="Condensate dripping within 40cm of a live patient monitor cart.",
         category="Facilities / HVAC", priority="High", status="Pending",
         sla_minutes=120, assigned_to=None, age=10),
    dict(id=12, employee_id=5, title="ER corridor emergency lighting circuit tripped",
         description="Corridor C emergency luminaires dark. Breaker reset held.",
         category="ER Power", priority="High", status="Resolved",
         sla_minutes=10, assigned_to=4, age=300),
]

for r in REQUESTS:
    age = r.pop("age")
    db.add(Request(
        **r,
        created_at=ago(age),
        updated_at=ago(max(0, age - 2)),
    ))
db.commit()

ESCALATIONS = [
    dict(request_id=1, from_status="Pending", to_status="Escalated",
         reason="SLA breach — 22 min elapsed against a 5 min SLA (Life Support)",
         escalated_to="Biomedical On-Call — Suresh Kumar", age=17),
    dict(request_id=2, from_status="Pending", to_status="Escalated",
         reason="SLA breach — 35 min elapsed against a 10 min SLA (Cold Chain / Vaccine)",
         escalated_to="Facility Admin — Vikram Nair", age=25),
    dict(request_id=1, from_status="Escalated", to_status="Escalated",
         reason="Manual flag by Dr. Anita Rao — patient is vent-dependent, no acknowledgement in 15 min",
         escalated_to="Chief Medical Officer", age=4),
]
for log in ESCALATIONS:
    age = log.pop("age")
    db.add(EscalationLog(**log, created_at=ago(age)))
db.commit()

# Explicit ids above don't advance Postgres's SERIAL sequences (SQLite has no
# such issue — it derives the next rowid from MAX(id) automatically). Without
# this, the next auto-generated insert collides with a seeded row's id.
if db.bind.dialect.name == "postgresql":
    from sqlalchemy import text
    for table in ("employees", "equipment", "requests", "escalation_logs", "swap_logs"):
        db.execute(text(
            f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
            f"COALESCE((SELECT MAX(id) FROM {table}), 1), true)"
        ))
    db.commit()

db.close()
print("Seed complete: 6 employees, 6 equipment units, 12 requests, 3 escalation logs.")
