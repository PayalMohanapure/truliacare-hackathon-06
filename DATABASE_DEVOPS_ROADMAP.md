DATABASE & DEVOPS ROADMAP — Dev 5 & Dev 6
Supabase = managed Postgres only. No Auth, no supabase-js, no PostgREST, no Edge Functions, no supabase pip package.

1. Ownership
Path	Owner
db/001_init.sql	Dev 5
backend/models.py	Dev 5
Supabase project creation, running the DDL, RLS verification	Dev 5
db/seed.py	Dev 6
.env, .env.example	Dev 6
SQLite fallback proof run	Dev 6
.gitignore	Dev 6 (commit #1, before anything else)
Dev 5 must have the schema live and verified by minute 25. Four people are blocked until then. This is the single hardest deadline in the build.

2. Dev 5 — db/001_init.sql
Run this by hand in the Supabase SQL Editor. No Alembic, no autogeneration, ever.


-- db/001_init.sql — OWNER: Dev 5
-- Paste into Supabase → SQL Editor → Run. Idempotent: safe to re-run.

DROP TABLE IF EXISTS escalation_logs CASCADE;
DROP TABLE IF EXISTS requests        CASCADE;
DROP TABLE IF EXISTS employees       CASCADE;

CREATE TABLE employees (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL,        -- 'employee' | 'admin' | 'technician'
    department  TEXT
);

CREATE TABLE requests (
    id           SERIAL PRIMARY KEY,
    employee_id  INTEGER NOT NULL REFERENCES employees(id),
    title        TEXT NOT NULL,
    description  TEXT,
    category     TEXT NOT NULL,
    priority     TEXT NOT NULL DEFAULT 'Medium',
    status       TEXT NOT NULL DEFAULT 'Pending',   -- Pending | In Progress | Resolved | Escalated
    sla_minutes  INTEGER NOT NULL,
    assigned_to  INTEGER REFERENCES employees(id),
    created_at   TIMESTAMP NOT NULL DEFAULT now(),
    updated_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE escalation_logs (
    id            SERIAL PRIMARY KEY,
    request_id    INTEGER NOT NULL REFERENCES requests(id),
    from_status   TEXT NOT NULL,
    to_status     TEXT NOT NULL,
    reason        TEXT NOT NULL,
    escalated_to  TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_requests_status      ON requests(status);
CREATE INDEX idx_requests_employee    ON requests(employee_id);
CREATE INDEX idx_requests_created     ON requests(created_at);
CREATE INDEX idx_esc_request          ON escalation_logs(request_id);

-- ══════════════════════════════════════════════════════════════════
-- RLS MUST BE OFF. Supabase enables it by default on tables created
-- through the Table Editor UI. RLS on + the postgres role over
-- psycopg2 = silent empty arrays with a 200 status, no error anywhere.
-- That failure mode has eaten 40 minutes from better teams than ours.
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE employees       DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests        DISABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_logs DISABLE ROW LEVEL SECURITY;
Verification block — run immediately after, paste output in team chat

-- 1. All three tables exist with the right columns
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('employees','requests','escalation_logs')
ORDER BY table_name, ordinal_position;

-- 2. RLS is OFF on all three. rowsecurity MUST be false, three times.
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('employees','requests','escalation_logs');

-- 3. Empty and readable
SELECT 'employees' t, count(*) FROM employees
UNION ALL SELECT 'requests', count(*) FROM requests
UNION ALL SELECT 'escalation_logs', count(*) FROM escalation_logs;
Gate at minute 25: Dev 5 posts a screenshot of query #2 showing false, false, false. Nobody proceeds against Postgres until that screenshot exists.

3. Dev 5 — backend/models.py (hand-written mirror)
001_init.sql is the source of truth. This file mirrors it by hand. It never autogenerates anything and it never drifts. Only types that exist in both Postgres and SQLite: no JSONB, no ARRAY, no UUID, DateTime not timezone-aware.


# backend/models.py — OWNER: Dev 5
# Hand-written mirror of db/001_init.sql. The SQL file is the source of truth.
# Postgres + SQLite compatible types only.
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from db import Base


class Employee(Base):
    __tablename__ = "employees"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(Text, nullable=False)
    role       = Column(Text, nullable=False)      # employee | admin | technician
    department = Column(Text)


class Request(Base):
    __tablename__ = "requests"
    id          = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    title       = Column(Text, nullable=False)
    description = Column(Text)
    category    = Column(Text, nullable=False)
    priority    = Column(Text, nullable=False, default="Medium")
    status      = Column(Text, nullable=False, default="Pending")
    sla_minutes = Column(Integer, nullable=False)
    assigned_to = Column(Integer, ForeignKey("employees.id"))
    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = Column(DateTime, nullable=False, default=datetime.utcnow)

    # TWO FKs point at employees, so foreign_keys= is MANDATORY on both.
    # Omit it and SQLAlchemy raises AmbiguousForeignKeysError at import time.
    employee = relationship("Employee", foreign_keys=[employee_id], lazy="joined")
    assignee = relationship("Employee", foreign_keys=[assigned_to], lazy="joined")


class EscalationLog(Base):
    __tablename__ = "escalation_logs"
    id           = Column(Integer, primary_key=True, index=True)
    request_id   = Column(Integer, ForeignKey("requests.id"), nullable=False)
    from_status  = Column(Text, nullable=False)
    to_status    = Column(Text, nullable=False)
    reason       = Column(Text, nullable=False)
    escalated_to = Column(Text)
    created_at   = Column(DateTime, nullable=False, default=datetime.utcnow)

    request = relationship("Request", lazy="joined")
lazy="joined" on the relationships means enrich() gets employee_name and assigned_to_name with no N+1 query storm — and, more importantly, with no extra code in either router.

Dev 5 timeline

Time	Task	Gate
0–8	Create the Supabase project. Copy the DB password into team chat immediately — Supabase shows it once.	Project provisioning
8–18	Paste 001_init.sql into the SQL Editor, run it	"Success. No rows returned"
18–25	Run all 3 verification queries. Screenshot query #2.	🔒 rowsecurity = false ×3 posted
25–45	Write models.py, push it	python -c "import models" from backend/ exits clean
45–60	Pair with Dev 6 on the connection string; get /health + GET /api/employees returning through the real DB	Backend talks to Supabase
60–110	On-call for DB issues. Own the troubleshooting table (§5). Manually insert one row and confirm it appears via the API.	—
110–150	Support integration	—
150–180	Own the "walk us through the schema" answer for judges	—
4. Dev 6 — Environment, Seed, Fallback
4.1 .gitignore — COMMIT THIS FIRST, BEFORE ANY OTHER FILE

# ── Python ──
__pycache__/
*.py[cod]
.venv/
venv/
env/

# ── Secrets — the whole point of committing this file first ──
.env
.env.local
*.env
!.env.example

# ── Node ──
node_modules/
dist/
.vite/
npm-debug.log*

# ── SQLite fallback ──
*.db
*.sqlite3
dev.db

# ── Editors / OS ──
.vscode/
.idea/
.DS_Store
Thumbs.db
Commit sequence, literally: git init → create .gitignore → git add .gitignore → git commit -m "chore: gitignore before anything else" → only then create .env. A Supabase password in git history cannot be un-pushed cleanly, and it costs code-quality marks when a judge browses the repo.

4.2 .env.example (committed) and .env (never committed)

# .env.example — COMMITTED. Placeholders only. Never a real password.

# ── PRIMARY: Supabase Session Pooler, port 5432 ──
# Supabase Dashboard → Connect → Session pooler → URI
#   ✅ port 5432   (Session pooler — prepared statements work)
#   ❌ port 6543   (Transaction pooler — breaks psycopg2 prepared statements)
#   ❌ db.<ref>.supabase.co  (direct — IPv6-only, dies on hackathon Wi-Fi)
# URL-encode the password:  @ → %40   : → %3A   / → %2F   # → %23
DATABASE_URL=postgresql+psycopg2://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-YOUR_REGION.pooler.supabase.com:5432/postgres

# ── FALLBACK: uncomment this line, comment the one above, restart uvicorn ──
# DATABASE_URL=sqlite:///./dev.db

# ── Frontend ──
VITE_API_URL=http://localhost:8000
Real .env sits next to it, gitignored, with the actual pooler host, project ref, and encoded password. Dev 6 pastes the working DATABASE_URL into team chat once, at minute 45, so all six devs have it.

frontend/.env (also gitignored): VITE_API_URL=http://localhost:8000

4.3 db/seed.py — idempotent, dual-engine, re-runnable at any moment

# db/seed.py — OWNER: Dev 6
# Run from repo root:  python db/seed.py
# Idempotent: wipes and reinserts. Safe to run 30 seconds before the demo.
# Works on Postgres AND SQLite unchanged (uses the ORM, never raw SQL).
import sys
from pathlib import Path
from datetime import datetime, timedelta

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from db import SessionLocal, engine, Base, DATABASE_URL   # noqa: E402
from models import Employee, Request, EscalationLog       # noqa: E402

Base.metadata.create_all(bind=engine)   # no-op on Postgres, builds schema on SQLite
db = SessionLocal()

# ── wipe, child tables first (FK order) ──
db.query(EscalationLog).delete()
db.query(Request).delete()
db.query(Employee).delete()
db.commit()

NOW = datetime.utcnow()          # MUST match escalation.py — utcnow, naive, never now()
ago = lambda m: NOW - timedelta(minutes=m)
Note for Dev 6: on Postgres the SERIAL sequences do not reset after .delete(). Explicit id= values are passed on every insert below so ids are deterministic — the demo script and the mock fixtures both depend on request id: 1 being the ventilator. After inserting, bump the sequences on Postgres:


if not DATABASE_URL.startswith("sqlite"):
    from sqlalchemy import text
    for t in ("employees", "requests", "escalation_logs"):
        db.execute(text(f"SELECT setval(pg_get_serial_sequence('{t}','id'), "
                        f"COALESCE((SELECT MAX(id) FROM {t}), 1))"))
    db.commit()
5. Judge-Ready Seed Dataset — written out in full
5.1 Employees — 2 admins, 2 technicians, 2 employees
id	name	role	department
1	Dr. Anita Rao	admin	Hospital Administration
2	Vikram Nair	admin	Facility Management
3	Suresh Kumar	technician	Biomedical Engineering
4	Farah Sheikh	technician	Electrical & HVAC
5	Priya Menon	employee	ICU — Ward 3
6	Rahul Das	employee	Pathology Lab

EMPLOYEES = [
    Employee(id=1, name="Dr. Anita Rao", role="admin",      department="Hospital Administration"),
    Employee(id=2, name="Vikram Nair",   role="admin",      department="Facility Management"),
    Employee(id=3, name="Suresh Kumar",  role="technician", department="Biomedical Engineering"),
    Employee(id=4, name="Farah Sheikh",  role="technician", department="Electrical & HVAC"),
    Employee(id=5, name="Priya Menon",   role="employee",   department="ICU — Ward 3"),
    Employee(id=6, name="Rahul Das",     role="employee",   department="Pathology Lab"),
]
db.add_all(EMPLOYEES); db.commit()
5.2 Requests — 12 rows across all four statuses
id	title	category	SLA	priority	status	by	assigned	age (min)	note
1	ICU Bed 4 ventilator alarm — low tidal volume	Life Support	5	Critical	Escalated	5	3	22	🔴 pre-breached + 2 logs
2	Vaccine fridge #2 temperature drift — reading +8°C	Cold Chain / Vaccine	10	Critical	Escalated	6	—	35	🔴 pre-breached + 1 log
3	ER backup generator fails auto-transfer test	ER Power	10	Critical	In Progress	5	4	6	4 min of headroom
4	Central oxygen manifold pressure dropping in Ward 3	Oxygen Supply	5	Critical	Pending	5	—	1	⏱ self-escalates 4 min after seeding
5	OT-2 surgical lighting flickers mid-procedure	Facilities / HVAC	120	High	In Progress	5	4	40	
6	Nurse station Wi-Fi down — EMR unreachable	IT / Network	60	High	Pending	6	—	15	⭐ the ⏩ demo target
7	Pathology lab HVAC not holding 18°C	Facilities / HVAC	120	Medium	In Progress	6	4	90	
8	Infusion pump #7 battery not holding charge	Life Support	5	High	Resolved	5	3	180	terminal
9	Blood bank fridge door seal worn	Cold Chain / Vaccine	10	Medium	Resolved	6	3	240	terminal
10	Radiology PACS workstation will not boot	IT / Network	60	Medium	Pending	6	—	30	30 min headroom
11	ICU ceiling AC unit leaking near monitor cart	Facilities / HVAC	120	High	Pending	5	—	10	
12	ER corridor emergency lighting circuit tripped	ER Power	10	High	Resolved	5	4	300	terminal
Status spread: Pending 4 · In Progress 3 · Resolved 3 · Escalated 2. All four statuses visible on first paint.


R = lambda **k: Request(**k)
REQUESTS = [
    R(id=1, employee_id=5, assigned_to=3, category="Life Support", sla_minutes=5,
      priority="Critical", status="Escalated", created_at=ago(22), updated_at=ago(17),
      title="ICU Bed 4 ventilator alarm — low tidal volume",
      description="Continuous low tidal volume alarm on Bed 4. Patient is vent-dependent. "
                  "Respiratory therapist bagging manually while we wait."),

    R(id=2, employee_id=6, category="Cold Chain / Vaccine", sla_minutes=10,
      priority="Critical", status="Escalated", created_at=ago(35), updated_at=ago(25),
      title="Vaccine fridge #2 temperature drift — reading +8°C",
      description="Cold chain unit 2 holding at +8°C against a +2 to +8°C spec ceiling and "
                  "still climbing. Approx. 400 doses at risk. Compressor cycling irregularly."),

    R(id=3, employee_id=5, assigned_to=4, category="ER Power", sla_minutes=10,
      priority="Critical", status="In Progress", created_at=ago(6), updated_at=ago(4),
      title="ER backup generator fails auto-transfer test",
      description="Weekly ATS test did not transfer load. Emergency dept is on utility "
                  "power with no verified backup path."),

    R(id=4, employee_id=5, category="Oxygen Supply", sla_minutes=5,
      priority="Critical", status="Pending", created_at=ago(1), updated_at=ago(1),
      title="Central oxygen manifold pressure dropping in Ward 3",
      description="Line pressure reading 2.8 bar against a 4.0 bar spec. Two patients "
                  "currently on supplemental O2 in this ward."),

    R(id=5, employee_id=5, assigned_to=4, category="Facilities / HVAC", sla_minutes=120,
      priority="High", status="In Progress", created_at=ago(40), updated_at=ago(30),
      title="OT-2 surgical lighting flickers mid-procedure",
      description="Overhead surgical lamp in Operating Theatre 2 flickering under load. "
                  "Elective list paused pending inspection."),

    R(id=6, employee_id=6, category="IT / Network", sla_minutes=60,
      priority="High", status="Pending", created_at=ago(15), updated_at=ago(15),
      title="Nurse station Wi-Fi down — EMR unreachable",
      description="Ward 3 nurse station cannot reach the EMR. Staff charting on paper, "
                  "medication administration records not syncing."),

    R(id=7, employee_id=6, assigned_to=4, category="Facilities / HVAC", sla_minutes=120,
      priority="Medium", status="In Progress", created_at=ago(90), updated_at=ago(60),
      title="Pathology lab HVAC not holding 18°C",
      description="Lab ambient sitting at 26°C. Haematology analyser calibration drifting "
                  "outside tolerance."),

    R(id=8, employee_id=5, assigned_to=3, category="Life Support", sla_minutes=5,
      priority="High", status="Resolved", created_at=ago(180), updated_at=ago(120),
      title="Infusion pump #7 battery not holding charge",
      description="Pump drops to mains-only within 4 minutes of unplugging. Battery pack "
                  "replaced and load-tested."),

    R(id=9, employee_id=6, assigned_to=3, category="Cold Chain / Vaccine", sla_minutes=10,
      priority="Medium", status="Resolved", created_at=ago(240), updated_at=ago(200),
      title="Blood bank fridge door seal worn",
      description="Gasket on blood bank unit 1 no longer seating. Condensation on inner "
                  "wall. Seal replaced, 24h temperature log verified."),

    R(id=10, employee_id=6, category="IT / Network", sla_minutes=60,
      priority="Medium", status="Pending", created_at=ago(30), updated_at=ago(30),
      title="Radiology PACS workstation will not boot",
      description="Reporting workstation 2 stuck on POST. Radiologist reporting queue "
                  "backing up, 14 studies unread."),

    R(id=11, employee_id=5, category="Facilities / HVAC", sla_minutes=120,
      priority="High", status="Pending", created_at=ago(10), updated_at=ago(10),
      title="ICU ceiling AC unit leaking near monitor cart",
      description="Condensate dripping within 40cm of a live patient monitor cart. "
                  "Cart relocated, drip tray placed as a stopgap."),

    R(id=12, employee_id=5, assigned_to=4, category="ER Power", sla_minutes=10,
      priority="High", status="Resolved", created_at=ago(300), updated_at=ago(250),
      title="ER corridor emergency lighting circuit tripped",
      description="Corridor C emergency luminaires dark. Breaker reset and held; "
                  "circuit load rebalanced."),
]
db.add_all(REQUESTS); db.commit()
5.3 Escalation logs — 3 rows, so the timeline has depth on first paint

LOGS = [
    EscalationLog(
        id=1, request_id=1, from_status="Pending", to_status="Escalated",
        reason="SLA breach — 22 min elapsed against a 5 min SLA (Life Support)",
        escalated_to="Biomedical On-Call — Suresh Kumar", created_at=ago(17)),

    EscalationLog(
        id=2, request_id=2, from_status="Pending", to_status="Escalated",
        reason="SLA breach — 35 min elapsed against a 10 min SLA (Cold Chain / Vaccine)",
        escalated_to="Facility Admin — Vikram Nair", created_at=ago(25)),

    EscalationLog(
        id=3, request_id=1, from_status="Escalated", to_status="Escalated",
        reason="Manual flag by Dr. Anita Rao — patient is vent-dependent, "
               "no technician acknowledgement in 15 min",
        escalated_to="Chief Medical Officer", created_at=ago(4)),
]
db.add_all(LOGS); db.commit()
db.close()
print(f"✅ Seeded 6 employees · 12 requests · 3 escalation logs → "
      f"{'SQLITE' if DATABASE_URL.startswith('sqlite') else 'POSTGRES'}")
Why this dataset wins the first five seconds:

Two red pulsing life-critical rows sit at the top of the admin queue the instant the page paints — no clicking required to look alive.
Request 1 has two log entries (auto SLA breach, then a manual CMO flag). The timeline reads like a real incident, not a stub.
Request 6 (Wi-Fi, 60-min SLA, Pending, 15 min old) is the reserved ⏩ target: 45 minutes of headroom, so it is guaranteed not to have self-escalated by demo time, and one click flips it.
Every category, every status, and every priority level is represented in 12 rows.
⏱ Request 4 self-escalates 4 minutes after seeding. That is intentional — it proves escalation is real and not a hardcoded demo path. But it means the pre-demo state drifts. Run python db/seed.py at minute 175, right before the demo. Deterministic state, one command.

6. Dev 6 — SQLite Fallback (prove it at minute 100, not at minute 160)
The fallback is one env var. Base.metadata.create_all(bind=engine) in main.py builds the schema automatically on SQLite — that is the entire fallback mechanism, and it works only because models.py uses no Postgres-only types.

The drill, run exactly once at minute 100, timed:


# 1. Point at SQLite
#    .env:  DATABASE_URL=sqlite:///./dev.db     (comment out the Supabase line)

# 2. Rebuild + reseed
rm -f backend/dev.db
python db/seed.py
# → ✅ Seeded 6 employees · 12 requests · 3 escalation logs → SQLITE

# 3. Boot
cd backend && uvicorn main:app --reload --port 8000
# → [db] engine → SQLITE FALLBACK

# 4. Prove it
curl http://localhost:8000/api/employees   # 6 rows
curl http://localhost:8000/api/requests    # 12 rows
curl -X POST "http://localhost:8000/api/requests/6/age?minutes=90"   # → "Escalated"

# 5. Switch back to Supabase in .env, restart, re-seed.
Gate: Dev 6 reports the wall-clock time of steps 1–4 in team chat. If it is under 60 seconds, the fallback is real insurance. If it isn't, fix it now while it costs nothing.

backend/dev.db stays in .gitignore — but keep the seeded file on disk. If Wi-Fi drops mid-demo, step 2 is already done.

Dev 6 timeline

Time	Task	Gate
0–5	git init, .gitignore, commit it first, push main, create the 3 branches	🔒 .gitignore is commit #1
5–15	.env.example + local .env (SQLite for now — unblocked while Dev 5 provisions)	Placeholders only in the committed file
15–45	Write db/seed.py complete against SQLite	Runs green on SQLite
45–60	Take Dev 5's Supabase URL, encode the password, run seed against Postgres, paste the working DATABASE_URL in team chat	12 rows visible in the Supabase Table Editor
60–85	README.md first draft (Doc 6)	Setup section complete
85–100	Own the connection troubleshooting table (§7); be the person everyone pings	—
100–115	⚠️ SQLite fallback drill, timed	🔒 < 60 seconds, reported in chat
115–150	Merge captain (Doc 5 §3)	Merges land clean
150–180	Re-seed at min 175. Own the "what if the DB dies" judge question.	Fresh deterministic state
7. Five-Minute Connection Troubleshooting Table
Symptom / error text	Root cause	Fix (60 seconds)
could not translate host name "db.xxx.supabase.co"	Using the direct connection host — IPv6-only. Most hackathon Wi-Fi is IPv4-only.	Switch to the pooler host: aws-0-<region>.pooler.supabase.com. Never use db.<ref>.supabase.co.
Network is unreachable / hangs then times out	Same IPv6 problem, or the venue firewall blocks 5432 outbound	Pooler host first. If 5432 is genuinely blocked, go SQLite — don't fight the venue network.
prepared statement "__asyncpg_stmt_1__" already exists / DuplicatePreparedStatementError	Port 6543 — Transaction pooler. Breaks psycopg2 prepared statements.	Change :6543 → :5432. Session pooler. This one is silent until it isn't.
FATAL: Tenant or user not found	Username missing the project ref	Must be postgres.<PROJECT_REF>, not bare postgres. Note the dot.
invalid port number or could not parse	Unencoded special character in the password	URL-encode: @→%40, :→%3A, /→%2F, #→%23, ?→%3F, &→%26. Or reset to an alphanumeric-only password in Supabase — faster than debugging encoding.
password authentication failed for user "postgres"	Wrong password, or the password was reset after the URL was copied	Supabase → Settings → Database → Reset database password. Re-encode. Re-paste to team chat.
API returns [] with a 200. No error anywhere. Table Editor shows rows.	🚨 RLS is ON. The single most expensive failure in this stack — it looks exactly like a backend bug.	ALTER TABLE <t> DISABLE ROW LEVEL SECURITY; for all three. Verify with the pg_tables query in §2.
relation "requests" does not exist	001_init.sql wasn't run, or was run in the wrong Supabase project	Re-run the DDL. Confirm the project ref in the URL matches the dashboard.
ModuleNotFoundError: No module named 'psycopg2'	psycopg2-binary missing, or the wrong venv is active	pip install psycopg2-binary==2.9.10. Confirm with which python.
sqlalchemy.exc.OperationalError: SSL connection has been closed unexpectedly	Idle pooler connection dropped	Already handled by pool_pre_ping=True in db.py. If it persists, restart uvicorn.
Backend starts but every query is slow (2–5s)	Congested venue Wi-Fi to the Supabase region	Go SQLite. Judges will not notice; a 5-second table load they will.
duplicate key value violates unique constraint "requests_pkey"	Re-seeding without the sequence reset	Run the setval block in §4.3, or just re-run 001_init.sql then seed.py.
ForeignKeyViolation on delete during seed	Wiping parents before children	Delete order is EscalationLog → Request → Employee. Already correct in §4.3.
Escalation ladder for connection problems — enforce this hard:

5 minutes on the table above → switch to SQLite and keep building. Nobody spends 20 minutes on a connection string. The app is engine-agnostic by design; that design exists precisely so this decision is cheap.
