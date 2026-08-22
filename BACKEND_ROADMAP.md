BACKEND ROADMAP — Dev 3 & Dev 4
Python 3.11+ · FastAPI · Pydantic v2 · SQLAlchemy 2.0 (sync) · Uvicorn on :8000

1. File Ownership

backend/
├── main.py            ← Dev 4 · written by min 15 · 🔒 FROZEN
├── db.py              ← Dev 4
├── models.py          ← Dev 5 (see Doc 4) — backend devs READ ONLY
├── schemas.py         ← Dev 4
├── escalation.py      ← Dev 3
├── routers/
│   ├── __init__.py    ← Dev 4 (empty file, min 10)
│   ├── requests.py    ← Dev 3
│   └── admin.py       ← Dev 4
└── requirements.txt   ← Dev 4 · min 5
File	Owner	Contains
main.py	Dev 4	app instance, CORS, the one exception handler, both include_router calls, /health
db.py	Dev 4	engine, SessionLocal, get_db(), Base, create_all()
schemas.py	Dev 4	every Pydantic model for both routers
escalation.py	Dev 3	CATEGORY_SLA, ESCALATION_TARGET, evaluate_sla(), enrich()
routers/requests.py	Dev 3	POST /requests, GET /requests, GET /requests/{id}, POST /requests/{id}/age
routers/admin.py	Dev 4	PATCH /status, PATCH /assign, GET /escalations, GET /employees, GET /stats
models.py	Dev 5	the 3 ORM classes — backend devs never edit this
main.py is the only shared file. Dev 4 writes it complete at minute 15 — both routers imported and included, even though requests.py is still an empty stub. Then it is frozen. Dev 3 creates routers/requests.py immediately as an empty APIRouter() so the import resolves.

requirements.txt (Dev 4, minute 5 — pin these, no extras):


fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy==2.0.36
psycopg2-binary==2.9.10
pydantic==2.10.4
python-dotenv==1.0.1
Not in this file, ever: supabase, alembic, apscheduler, celery, python-jose, passlib, bcrypt.

2. Dev 4 — main.py (write at minute 10–15, then freeze)

# backend/main.py — OWNER: Dev 4. FROZEN AT MINUTE 15. Nobody edits this after that.
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from db import Base, engine
import models                      # noqa: F401 — registers tables on Base
from routers import requests as requests_router
from routers import admin as admin_router

# Postgres: no-op (tables already created by 001_init.sql).
# SQLite fallback: builds the whole schema. This one line IS the fallback mechanism.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SENTINEL — Hospital Maintenance & Escalation", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # hackathon. X-User-Id is a custom header —
    allow_credentials=False,   # allow_headers=["*"] is what makes the preflight pass.
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── THE ONE EXCEPTION CONVENTION ──────────────────────────────────────
# Everything the app rejects is raised as HTTPException(status_code, detail="msg").
# These three handlers reshape every failure into {"error": "..."}.
# No custom exception classes. No error-code enums. No subclassing. This is it.

@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})

@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    e = exc.errors()[0]
    field = ".".join(str(p) for p in e["loc"] if p not in ("body", "query"))
    return JSONResponse(status_code=422, content={"error": f"{field}: {e['msg']}"})

@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception):
    print(f"[UNHANDLED] {type(exc).__name__}: {exc}")   # visible in the uvicorn log
    return JSONResponse(status_code=500, content={"error": "Internal server error"})
# ──────────────────────────────────────────────────────────────────────

app.include_router(requests_router.router, prefix="/api", tags=["requests"])
app.include_router(admin_router.router,    prefix="/api", tags=["admin"])

@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
Run: uvicorn main:app --reload --port 8000 from backend/.

The exception rule, stated once for the whole team:

Raise HTTPException(status_code=404, detail="Request 99 not found"). That is the only way anything fails in this codebase. No class NotFoundError(Exception). No error-code registry. No try/except around database calls. If SQLAlchemy blows up, the catch-all returns 500 and prints the traceback to your terminal — which is exactly what you want at minute 130.

3. Dev 4 — db.py

# backend/db.py — OWNER: Dev 4
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
IS_SQLITE = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,                                        # survives pooler drops
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    echo=False,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

print(f"[db] engine → {'SQLITE FALLBACK' if IS_SQLITE else 'SUPABASE POSTGRES'}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
4. Dev 3 — escalation.py (the heart of the app)
This file is Dev 3's highest-value 25 minutes. Write it before the router.


# backend/escalation.py — OWNER: Dev 3
# The single source of truth for SLA. Nothing else in the codebase computes escalation.
from datetime import datetime
from sqlalchemy.orm import Session
from models import Request, EscalationLog

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


def age_minutes(row: Request) -> int:
    return int((datetime.utcnow() - row.created_at).total_seconds() // 60)


def evaluate_sla(db: Session, rows: list[Request]) -> list[Request]:
    """Flip newly-breached rows to Escalated and log it. Commits once.

    IDEMPOTENCY: 'Escalated' is in the skip set, so a row that is already
    escalated is never re-logged. Exactly one log row per transition.
    Remove that guard and the timeline fills with duplicates in 30 seconds.
    """
    changed = False
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
            ))
            row.status = "Escalated"
            row.updated_at = datetime.utcnow()
            changed = True
    if changed:
        db.commit()
        for row in rows:
            db.refresh(row)
    return rows


def enrich(row: Request) -> dict:
    """ORM row → the exact RequestOut dict in SPDD §6.1. Every key, always present."""
    age = age_minutes(row)
    remaining = row.sla_minutes - age
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
        "created_at": row.created_at.isoformat(timespec="seconds"),
        "updated_at": row.updated_at.isoformat(timespec="seconds"),
        "age_minutes": age,
        "minutes_remaining": remaining,
        "is_breached": remaining < 0 and row.status not in TERMINAL,
    }


def sort_rows(rows: list[Request]) -> list[Request]:
    """Breached first, then by priority, then oldest first. Fixed order — see SPDD §6.4."""
    return sorted(rows, key=lambda r: (
        not (r.sla_minutes - age_minutes(r) < 0 and r.status not in TERMINAL),
        PRIORITY_RANK.get(r.priority, 9),
        r.created_at,
    ))
Timezone rule for the whole backend: datetime.utcnow() everywhere, naive, no tzinfo. The DDL uses TIMESTAMP not TIMESTAMPTZ. Do not mix in datetime.now() — comparing a local-time row against a UTC now will make every ticket look either instantly breached or never breached, and it will look like the SLA logic is wrong when it isn't.

Seed alignment note: db/seed.py writes created_at with datetime.utcnow() too. Dev 3 and Dev 6 must not diverge on this. Confirm it out loud at the minute-20 gate.

5. Dev 3 — routers/requests.py

# backend/routers/requests.py — OWNER: Dev 3
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from db import get_db
from models import Request, Employee
from schemas import RequestCreate
from escalation import CATEGORY_SLA, evaluate_sla, enrich, sort_rows

router = APIRouter()
#	Route	Body / Query	Logic	Returns
1	POST /requests	body RequestCreate; header x_user_id: int = Header(..., alias="X-User-Id")	400 if category not in CATEGORY_SLA; 404 if employee missing; sla_minutes = CATEGORY_SLA[category]; status="Pending"; employee_id = x_user_id	201 enrich(row)
2	GET /requests	status, category, employee_id, assigned_to — all Query(None)	build query, apply non-null filters, .all() → evaluate_sla(db, rows) → sort_rows	200 [enrich(r) for r in rows]
3	GET /requests/{id}	—	404 if absent; evaluate_sla(db, [row])	200 enrich(row)
4	POST /requests/{id}/age	minutes: int = Query(..., ge=1, le=10080)	404 if absent; row.created_at -= timedelta(minutes=minutes); commit; evaluate_sla(db, [row])	200 enrich(row) — already showing Escalated
Route 1 skeleton (the header pattern everyone copies):


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

    row = Request(
        employee_id=x_user_id,
        title=payload.title,
        description=payload.description or "",
        category=payload.category,
        priority=payload.priority,
        status="Pending",
        sla_minutes=CATEGORY_SLA[payload.category],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(row); db.commit(); db.refresh(row)
    return enrich(row)
Route 4 — the demo endpoint (get this exactly right, it is the money shot):


@router.post("/requests/{request_id}/age")
def age_request(
    request_id: int,
    minutes: int = Query(..., ge=1, le=10080, description="Backdate created_at by N minutes"),
    db: Session = Depends(get_db),
):
    row = db.get(Request, request_id)
    if not row:
        raise HTTPException(404, f"Request {request_id} not found")
    row.created_at = row.created_at - timedelta(minutes=minutes)
    db.commit()
    evaluate_sla(db, [row])          # escalate NOW, in this same request
    db.refresh(row)
    return enrich(row)
evaluate_sla runs inside the age call so the single HTTP response already carries status: "Escalated". The judge sees the row go red on the button click, not on the next poll. That one detail is the difference between "nice" and "wow".

Dev 3 timeline

Time	Task	Gate
0–10	venv, pip install -r requirements.txt, create routers/__init__.py + empty routers/requests.py with router = APIRouter() so Dev 4's main.py imports cleanly	uvicorn main:app starts, /health returns ok
10–20	Read the contract. Agree datetime.utcnow() with Dev 6.	Contract + timezone locked
20–45	escalation.py complete — push it. Dev 4 needs enrich.	🔒 escalation.py pushed
45–60	POST /requests + GET /requests/{id}	201 in Swagger with real ids
60–80	GET /requests + all 4 filters + evaluate_sla wired + sort_rows	?status=Escalated returns only escalated
80–95	POST /requests/{id}/age	Age a Pending row by 30 → response says Escalated, is_breached: true
95–110	Verify exactly one log row per escalation: call GET /api/requests five times, then GET /api/escalations and count	Count does not grow. This is the #1 bug in this build.
110–150	Integration with Dev 2, fix key mismatches	—
150–180	Stand by, be the one who can explain evaluate_sla() to a judge	—
6. Dev 4 — schemas.py and routers/admin.py
6.1 schemas.py — Pydantic v2 (minute 15–30, push immediately)

# backend/schemas.py — OWNER: Dev 4
from typing import Literal, Optional
from pydantic import BaseModel, Field

Status   = Literal["Pending", "In Progress", "Resolved", "Escalated", "Closed"]
Priority = Literal["Low", "Medium", "High", "Critical"]

class RequestCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = ""
    category: str
    priority: Priority = "Medium"

class StatusUpdate(BaseModel):
    status: Status

class AssignUpdate(BaseModel):
    assigned_to: Optional[int] = None

class EmployeeOut(BaseModel):
    id: int
    name: str
    role: str
    department: Optional[str] = None
    model_config = {"from_attributes": True}
RequestOut is deliberately not a Pydantic model — enrich() returns a plain dict that already matches the contract exactly. Adding a response model here buys nothing and costs a serialization mismatch hunt at minute 130. Endpoints return dicts. Swagger still documents the routes.

6.2 routers/admin.py — the five routes

# backend/routers/admin.py — OWNER: Dev 4
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from db import get_db
from models import Request, Employee, EscalationLog
from schemas import StatusUpdate, AssignUpdate
from escalation import evaluate_sla, enrich, ESCALATION_TARGET, TERMINAL

router = APIRouter()
#	Route	Body / Query	Logic	Returns
1	GET /employees	?role= optional	filter by role if given	200 [{id,name,role,department}]
2	PATCH /requests/{id}/status	StatusUpdate + X-User-Id	404 if absent; set status; updated_at=utcnow(); if status=="Escalated" write a manual EscalationLog with reason=f"Manual escalation by {actor.name}"	200 enrich(row)
3	PATCH /requests/{id}/assign	AssignUpdate	404 request / 404 employee; 400 if target role is employee; auto-bump Pending → In Progress	200 enrich(row)
4	GET /escalations	?request_id= optional	join Request for request_title + category; order created_at DESC	200 log array (SPDD §6.9)
5	GET /stats	—	evaluate_sla(db, all_open_rows) first, then count	200 stats object (SPDD §6.10)
Route 2 — manual escalation:


@router.patch("/requests/{request_id}/status")
def update_status(
    request_id: int,
    payload: StatusUpdate,
    x_user_id: int = Header(1, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    row = db.get(Request, request_id)
    if not row:
        raise HTTPException(404, f"Request {request_id} not found")

    previous = row.status
    row.status = payload.status
    row.updated_at = datetime.utcnow()

    if payload.status == "Escalated" and previous != "Escalated":
        actor = db.get(Employee, x_user_id)
        db.add(EscalationLog(
            request_id=row.id, from_status=previous, to_status="Escalated",
            reason=f"Manual escalation by {actor.name if actor else 'Admin'}",
            escalated_to=ESCALATION_TARGET.get(row.category, "Facility Admin"),
        ))
    db.commit(); db.refresh(row)
    return enrich(row)
Route 3 — assign auto-acknowledges (Innovation mark):


@router.patch("/requests/{request_id}/assign")
def assign_request(request_id: int, payload: AssignUpdate, db: Session = Depends(get_db)):
    row = db.get(Request, request_id)
    if not row:
        raise HTTPException(404, f"Request {request_id} not found")

    if payload.assigned_to is not None:
        tech = db.get(Employee, payload.assigned_to)
        if not tech:
            raise HTTPException(404, f"Employee {payload.assigned_to} not found")
        if tech.role == "employee":
            raise HTTPException(400, "assigned_to must reference an employee "
                                     "with role technician or admin")
        if row.status == "Pending":
            row.status = "In Progress"      # assigning IS acknowledging

    row.assigned_to = payload.assigned_to
    row.updated_at = datetime.utcnow()
    db.commit(); db.refresh(row)
    return enrich(row)
Route 5 — stats:


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    evaluate_sla(db, db.query(Request).filter(~Request.status.in_(TERMINAL)).all())
    rows = db.query(Request).all()
    n = lambda s: sum(1 for r in rows if r.status == s)
    total, esc = len(rows), n("Escalated")
    return {
        "total": total,
        "pending": n("Pending"),
        "in_progress": n("In Progress"),
        "resolved": n("Resolved"),
        "escalated": esc,
        "critical_open": sum(1 for r in rows
                             if r.priority == "Critical" and r.status not in TERMINAL),
        "breached_open": sum(1 for r in rows
                             if r.status == "Escalated" and r.status not in TERMINAL),
        "breach_rate_pct": round(esc / total * 100, 1) if total else 0.0,
    }
Dev 4 timeline

Time	Task	Gate
0–10	requirements.txt, venv, routers/__init__.py, folder skeleton	pip install clean
10–15	main.py complete + db.py. Push.	🔒 main.py FROZEN, /docs loads
15–30	schemas.py. Push.	Dev 3 unblocked
30–50	GET /employees + GET /stats (stats can return zeros until seed lands)	Both 200 in Swagger
50–75	PATCH /status + manual escalation log	Setting Escalated creates exactly one log row
75–95	PATCH /assign + auto-bump + role guard	Assigning a Pending ticket returns In Progress
95–110	GET /escalations with the join and ?request_id= filter	Timeline payload matches §6.9 key-for-key
110–150	Integration, CORS fixes, be the responder for Dev 2's mismatch batch	—
150–180	Own the Swagger walkthrough if a judge asks to see the API	—
7. Direct Swagger Contract Checklist
Run this at minute 105, and again at minute 175 after the final seed. It is the entire test suite. Open http://localhost:8000/docs.

#	Route	Input	Expected	Proves
1	GET /health	—	{"status":"ok"}	App boots
2	GET /api/employees	—	6 rows, roles admin×2, technician×2, employee×2	DB connected, seed landed
3	GET /api/requests	no filters	12 rows. Rows 1–2 are Escalated. Rows sorted breached-first.	F1+F3 read path + sort
4	GET /api/requests	?status=Escalated	exactly the escalated rows	Filtering
5	GET /api/requests	?employee_id=5	only Priya's tickets	Employee Dashboard path
6	POST /api/requests	Set X-User-Id: 5. Body: {"title":"Ward 3 oxygen flowmeter reading zero","description":"Bed 12 flowmeter shows 0 LPM with valve open.","category":"Oxygen Supply","priority":"Critical"}	201, id: 13, sla_minutes: 5, status: "Pending", employee_name: "Priya Menon", is_breached: false	F1 write path + X-User-Id + category→SLA derivation
7	POST /api/requests	same body, category: "Plumbing"	400 {"error":"Unknown category 'Plumbing'. Allowed: ..."}	Error convention
8	POST /api/requests	omit the X-User-Id header	400 {"error":"X-User-Id header is required"}	Header enforcement
9	GET /api/requests/13	—	the row from step 6	Detail read
10	PATCH /api/requests/13/assign	{"assigned_to": 3}	200, assigned_to_name: "Suresh Kumar", status: "In Progress"	F2 + auto-acknowledge
11	PATCH /api/requests/13/assign	{"assigned_to": 5} (Priya is an employee)	400 role guard	Validation
12	PATCH /api/requests/13/status	{"status":"Resolved"}	200, is_breached: false permanently	F2 close path
13	PATCH /api/requests/13/status	{"status":"Done"}	422 {"error":"status: Input should be ..."}	Enum guard
14	GET /api/escalations	—	3 seeded rows, newest first, each with request_title + escalated_to	F3 audit trail
15	GET /api/escalations	?request_id=1	2 rows (auto + manual)	Timeline filter
16	GET /api/stats	—	counts sum to total; escalated: 2	Dashboard cards
17	GET /api/requests	run it 5 times	then GET /api/escalations → still 3 rows	🔴 NO DUPLICATE LOGS — the critical idempotency check
18	GET /api/requests/6	Wi-Fi ticket, sla_minutes: 60	status: "Pending"	Baseline before the finale
19	⭐ POST /api/requests/6/age	?minutes=90	200, status: "Escalated", is_breached: true, minutes_remaining negative, age_minutes ≈ 105	THE DEMO. Escalation in one round trip.
20	GET /api/escalations?request_id=6	—	1 new row, reason: "SLA breach — 105 min elapsed against a 60 min SLA (IT / Network)", escalated_to: "Facility Admin — Vikram Nair"	Full loop closed, audited
21	GET /api/stats	—	escalated incremented by 1	Stats stay live
Green = backend done. Then reset for the demo: python db/seed.py.

Step 17 is the one to obsess over. If the count grows, evaluate_sla is missing row.status == "Escalated" in its skip condition. Fix it before doing anything else — it corrupts the timeline in front of the judge.

8. Backend Failure Playbook
Symptom	Cause	Fix
ImportError: cannot import name 'router'	Dev 3's requests.py doesn't exist yet	Create it at minute 5 with just from fastapi import APIRouter / router = APIRouter()
Every ticket instantly Escalated	datetime.now() mixed with datetime.utcnow()	Grep for datetime.now( across backend/ and db/seed.py. Zero hits allowed.
Escalation logs multiply on every refresh	Escalated not in the skip set	Fix evaluate_sla guard, then DELETE FROM escalation_logs; and re-seed
CORS preflight fails on POST	allow_headers not ["*"] — X-User-Id is custom	It's already ["*"] in main.py. Confirm nobody edited the frozen file.
422 on the age endpoint	minutes sent in the body instead of the query string	POST /api/requests/6/age?minutes=90, body empty
sqlalchemy.exc.OperationalError on boot	Connection string — see Doc 4 §5	Wrong pooler port or unencoded password 90% of the time
AttributeError: 'Request' has no attribute 'employee'	Missing relationship() in models.py	Dev 5's file. Needs employee and assignee relationships with explicit foreign_keys= — two FKs point at employees.
Changes don't appear	uvicorn without --reload	uvicorn main:app --reload --port 8000
