🏥 SENTINEL — Smart Maintenance Request & Escalation System
Hospital Critical-Asset Edition
In a hospital, a maintenance ticket is a countdown timer attached to a patient. SENTINEL assigns a life-criticality SLA to every request at creation, and escalates it automatically when that SLA is breached — routing it to the on-call biomedical technician with a full audit trail.

Built in a 3-hour mini hackathon by a team of six.

✨ What It Does
Feature	Detail
Employee request submission	Pick your identity from the header switcher, raise a request with a category and priority. The SLA is derived automatically from the category — the user never types it.
Live SLA countdown	Every ticket shows a per-second countdown. It turns amber under 10 minutes, orange under 2, and red the moment it goes negative.
Automatic escalation	Any open ticket past its SLA flips to Escalated, gets routed to the right on-call authority, and writes an immutable escalation_logs row. No scheduler, no cron, no background worker — escalation is computed on read, which makes it deterministic and demonstrable on command.
Admin queue	All tickets, breached-first, filterable by status and category. Update status, assign a technician. Assigning auto-acknowledges (Pending → In Progress).
Escalation audit trail	Every escalation records from_status, to_status, the reason with actual elapsed minutes, and who it was escalated to.
⏩ SLA time machine	A one-click endpoint that backdates a ticket so you can watch escalation happen live instead of waiting an hour.
SLA Tiers
Category	SLA	Escalates to
Life Support	5 min	Biomedical On-Call
Oxygen Supply	5 min	Biomedical On-Call
Cold Chain / Vaccine	10 min	Facility Admin
ER Power	10 min	Electrical On-Call
IT / Network	60 min	Facility Admin
Facilities / HVAC	120 min	Facility Admin
🛠 Technologies Used
Frontend — React 18, Vite, Tailwind CSS, React Router, Axios
Backend — Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (sync), Uvicorn
Database — Supabase (managed PostgreSQL) via psycopg2-binary; SQLite fallback
Tooling — python-dotenv, hand-run SQL migration (no Alembic)

Deliberately not used: Supabase Auth, supabase-js, PostgREST, Edge Functions, the supabase Python package, JWT, Alembic, Docker, APScheduler/Celery. Supabase is used purely as managed Postgres, reached over SQLAlchemy.

🏗 Architecture

flowchart LR
    UI["React 18 · Vite · Tailwind<br/>:5173"] -->|"HTTP/JSON<br/>X-User-Id"| API["FastAPI<br/>:8000"]
    API --> ESC["escalation.py<br/>evaluate_sla()"]
    API --> ORM["SQLAlchemy 2.0"]
    ORM --> PG[("Supabase Postgres<br/>employees · requests<br/>escalation_logs")]
    ORM -. "DATABASE_URL switch" .-> LT[("SQLite dev.db")]
    style PG fill:#065f46,color:#fff
    style ESC fill:#7f1d1d,color:#fff

smr/
├── backend/
│   ├── main.py            # app, CORS, the single exception handler
│   ├── db.py              # engine, session, Base
│   ├── models.py          # 3 ORM models — hand mirror of 001_init.sql
│   ├── schemas.py         # Pydantic v2
│   ├── escalation.py      # SLA map + evaluate_sla() — the whole escalation engine
│   ├── routers/
│   │   ├── requests.py    # POST/GET requests, GET by id, POST age
│   │   └── admin.py       # PATCH status/assign, GET escalations/employees/stats
│   └── requirements.txt
├── db/
│   ├── 001_init.sql       # DDL — run by hand in the Supabase SQL Editor
│   └── seed.py            # judge-ready hospital dataset
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api/{client.js, mocks.js}
│       ├── layout/{Header.jsx, UserSwitcher.jsx}
│       ├── pages/{EmployeeDashboard.jsx, AdminQueue.jsx}
│       └── components/{NewRequestForm, TicketTable, StatusBadge,
│                       SlaCountdown, EscalationTimeline, StatCards}.jsx
└── README.md
Design principle: modularity here means file boundaries, not architectural layers. One router per domain, one models.py, one schemas.py, one component per file, one function that owns SLA. No repository pattern, no service layer, no DI container — six developers built this in parallel without two people ever opening the same file.

🚀 Setup
Prerequisites: Python 3.11+, Node 18+, a Supabase project (or nothing at all — the SQLite fallback needs no external service).

1 · Clone

git clone <repo-url> && cd smr
2 · Database — run the schema
Open your Supabase project → SQL Editor → New query → paste the entire contents of db/001_init.sql → Run.

Then verify RLS is off on all three tables (this is not optional — RLS on returns silent empty arrays through the postgres role):


SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname='public' AND tablename IN ('employees','requests','escalation_logs');
-- expect: rowsecurity = false, three times
3 · Environment

cp .env.example backend/.env
Edit backend/.env with your real connection string. Use the Session Pooler on port 5432.

Supabase Dashboard → Connect → Session pooler → copy the URI, then change the driver prefix to postgresql+psycopg2://.

4 · Backend — one command

cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt && uvicorn main:app --reload --port 8000
→ API at http://localhost:8000 · Swagger at http://localhost:8000/docs
The startup log prints which engine it bound to: [db] engine → SUPABASE POSTGRES.

5 · Seed the demo data
From the repo root, with the backend venv active:


python db/seed.py
# ✅ Seeded 6 employees · 12 requests · 3 escalation logs → POSTGRES
Idempotent — it wipes and reinserts, so it is safe to re-run at any time (including 30 seconds before a demo, which is exactly what it is for).

6 · Frontend — one command

cd frontend && npm install && npm run dev
→ UI at http://localhost:5173

🔧 .env.example

# ── PRIMARY: Supabase Session Pooler, port 5432 ──
# Dashboard → Connect → Session pooler → URI
#   ✅ port 5432  (Session pooler — prepared statements work)
#   ❌ port 6543  (Transaction pooler — breaks psycopg2 prepared statements)
#   ❌ db.<ref>.supabase.co  (direct connection — IPv6-only)
# URL-encode special characters in the password:
#   @ → %40   : → %3A   / → %2F   # → %23   ? → %3F   & → %26
DATABASE_URL=postgresql+psycopg2://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-YOUR_REGION.pooler.supabase.com:5432/postgres

# ── FALLBACK: no external service required ──
# DATABASE_URL=sqlite:///./dev.db

# ── Frontend ──
VITE_API_URL=http://localhost:8000
⚠️ .env is gitignored and must never be committed. .env.example contains placeholders only.

SQLite fallback — zero external dependencies
Comment out the Supabase line, uncomment the SQLite line, restart uvicorn, and re-run python db/seed.py. The schema is created automatically by Base.metadata.create_all() at startup. The entire app runs identically with no Supabase account at all — useful for offline development and as live insurance during a demo.

📡 API Reference
Base URL http://localhost:8000. Every request carries X-User-Id: <int>. All errors return {"error": "<message>"}.

Method	Path	Purpose
GET	/api/employees	List employees (?role=technician)
POST	/api/requests	Create a request — employee_id comes from the X-User-Id header, sla_minutes from the category
GET	/api/requests	List, filterable by ?status= &category= &employee_id= &assigned_to=. Runs the SLA evaluation. Sorted breached-first.
GET	/api/requests/{id}	Single request
POST	/api/requests/{id}/age?minutes=N	⭐ Backdate created_at by N minutes and evaluate immediately — the live-breach demo
PATCH	/api/requests/{id}/status	{"status": "In Progress"} — manual Escalated writes a log row
PATCH	/api/requests/{id}/assign	{"assigned_to": 3} — auto-bumps Pending → In Progress
GET	/api/escalations	Audit trail (?request_id=)
GET	/api/stats	Counts per status for the dashboard cards
Interactive docs: http://localhost:8000/docs

🎬 2-Minute Demo Script
Setup: python db/seed.py, then two tabs — localhost:5173 and localhost:5173/admin. Header switcher on Priya Menon. Do not click ⏩ before starting.

[0:00] Frame it.

"In a hospital, a maintenance ticket has a patient attached to it. A ventilator alarm and a broken office chair can't sit in the same queue. SENTINEL attaches a life-criticality SLA to every request and escalates by itself when it's breached."

[0:15] ① Employee raises a request.
As Priya Menon (ICU), click New Request → title Ward 3 oxygen flowmeter reading zero, category Oxygen Supply, priority Critical. Point at the live hint — "escalates in 5 minutes". Submit. The countdown starts ticking.

[0:30] ② Admin triages.
Switch to Dr. Anita Rao (admin) → /admin.

"Breached-first ordering. Two life-critical tickets are already red — an ICU ventilator and a vaccine fridge at +8°C — because they blew their SLA before this page ever loaded."

[0:50] ③ Assign, and note the automation.
Assign the oxygen ticket to Suresh Kumar (Biomedical).

"Assigning auto-acknowledges — Pending flips to In Progress in the same call. One click instead of two."

[1:05] ④ ⭐ The live SLA breach.
Find Nurse station Wi-Fi down — EMR unreachable (Pending, 60-min SLA, ~45 min of headroom). Click ⏩ Simulate SLA breach → 90 min.
Watch, in one round trip: badge → solid red Escalated · row pulses red with 🚨 · countdown → +45:00 OVER · row jumps to the top · a new escalation timeline entry appears.

"No scheduler, no cron, no background worker. Escalation is computed on read — the backend evaluates elapsed time against the SLA on every fetch, flips the status, and writes an immutable audit row. Deterministic and provable on demand."

[1:35] ⑤ The audit trail.
Point at the new entry: "SLA breach — 105 min elapsed against a 60 min SLA (IT / Network) → Facility Admin — Vikram Nair."

"Every escalation records who it went to and why. In production this row is the page to the on-call technician. Nothing escalates silently."

[1:50] ⑥ Close.

"React, FastAPI, Postgres. Three tables, nine endpoints, one SLA function. Employee raises, admin assigns, the system escalates on its own — end to end, all of it on this screen."

🩺 Troubleshooting
Symptom	Fix
API returns [] with status 200, but the Supabase Table Editor shows rows	RLS is on. ALTER TABLE <t> DISABLE ROW LEVEL SECURITY; on all three tables.
prepared statement ... already exists	You're on port 6543 (Transaction pooler). Change to 5432.
could not translate host name "db.xxx.supabase.co"	Direct connection is IPv6-only. Use the ...pooler.supabase.com host.
FATAL: Tenant or user not found	Username must be postgres.<PROJECT_REF>, not bare postgres.
invalid port number / parse failure	URL-encode the password: @→%40, :→%3A, /→%2F, #→%23.
Every ticket instantly Escalated	A datetime.now() crept in somewhere. The whole codebase uses datetime.utcnow().
Escalation logs multiply on each refresh	The Escalated guard is missing from evaluate_sla()'s skip condition.
CORS error in the browser console	allow_headers=["*"] is required — X-User-Id is a custom header and fails preflight without it.
Countdown is off by several hours	Something is parsing created_at in JS. Use the server's minutes_remaining field instead.
Nothing connects at all	Switch to DATABASE_URL=sqlite:///./dev.db, restart, re-seed. No external service needed.
👥 Team Members
Role	Name	Responsibilities
Frontend — Employee Experience	_______________________	App.jsx, Header, UserSwitcher, EmployeeDashboard, NewRequestForm, Tailwind system
Frontend — Admin & API Client	_______________________	AdminQueue, TicketTable, StatusBadge, SlaCountdown, EscalationTimeline, api/client.js
Backend — Requests & SLA Engine	_______________________	routers/requests.py, escalation.py, the ⏩ demo endpoint
Backend — Admin & Core	_______________________	routers/admin.py, schemas.py, db.py, main.py, CORS, exception handling
Database — Schema & Models	_______________________	db/001_init.sql, models.py, Supabase provisioning, RLS verification
DevOps — Seed & Resilience	_______________________	db/seed.py, environment config, SQLite fallback, merge captain
📄 License
MIT — built for a hackathon, free to use.

Three tables. Nine endpoints. One SLA function. Zero background workers.

⏭ Ready for Phase 2
Six documents delivered. Nothing scaffolded, nothing executed.

Three things worth deciding before you say BUILD:

Request id: 4 (oxygen manifold, 1 min old, 5-min SLA) self-escalates ~4 minutes after seeding. I kept it because it proves escalation isn't a hardcoded demo path — but it means pre-demo state drifts. The plan handles this by re-seeding at minute 175. If you'd rather have zero drift, say so and I'll age it to a category with headroom.

X-User-Id is the sole source of employee_id on POST /api/requests — no employee_id in the request body. If your team would rather send it in the body, that changes Dev 3's route and Dev 2

's client.js. Flag it now, not at minute 110.

Nine endpoints, but only two shared files — backend/main.py and frontend/src/App.jsx, both frozen at minute 15. This is the single rule that makes six-person parallelism work. If your team won't hold that discipline, the file-ownership table in INTEGRATION_PLAN.md §4 is decorative and merges will hurt at minute 110.
What I'd do next, in order:

Say	And I'll produce
BUILD	The full repo — backend/ (7 files), db/ (2 files), frontend/src/ (13 files), configs, .gitignore. Roughly the order the plan merges in: db → be → fe.
BUILD BACKEND	Just backend/ + db/ — the API demoable through Swagger on its own
BUILD FRONTEND	Just frontend/ running fully on USE_MOCKS = true, no backend required
FILES	Write these six .md documents to disk in the working directory instead of leaving them in chat
If you want the docs on disk before anything else, FILES is the cheap move — the team can open them in the repo at minute 0 rather than scrolling a chat log.
