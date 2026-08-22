INTEGRATION PLAN — 180 Minutes, 6 Developers
Roles: D1 FE-Employee · D2 FE-Admin · D3 BE-Requests/SLA · D4 BE-Admin/Core · D5 DB-Schema · D6 DevOps/Seed

1. Minute-by-Minute Schedule
Phase 0 · 0–20 · Setup, Schema & Contracts Alignment
Min	D1 · FE-Emp	D2 · FE-Admin	D3 · BE-SLA	D4 · BE-Core	D5 · DB	D6 · DevOps
0–5	Vite scaffold	Read API contract	venv + install	requirements.txt	Create Supabase project	git init → .gitignore = commit #1 → push main + 3 branches
5–10	Tailwind init	Draft constants.js	Empty routers/requests.py stub	db.py	Copy DB password to chat	.env.example
10–15	Write App.jsx complete	Sketch mock shapes	Read escalation.py spec	Write main.py complete	Paste + run 001_init.sql	local .env (SQLite)
15–20	tailwind.config.js	—	Confirm utcnow() w/ D6	schemas.py start	Run 3 verify queries	Confirm utcnow() w/ D3
🚦 GATE 0 @ 20 min — 90-second standup, everyone speaks:

D5: RLS screenshot posted, rowsecurity = false ×3? (hard blocker)
D4: App.jsx and main.py both pushed and frozen?
Everyone: read SPDD §6.1 aloud once. X-User-Id carries employee_id on POST. FE never parses created_at.
D3+D6: both using datetime.utcnow()?
If D5 is not green: the whole team goes SQLite immediately, D5 keeps working Supabase in the background, and we merge to Postgres at minute 110 or never. Nobody waits.

Phase 1 · 20–110 · Parallel Domain Sprint
Min	D1	D2	D3	D4	D5	D6
20–35	Header + UserSwitcher	client.js + mocks.js → push	escalation.py	schemas.py → push	models.py	seed.py (SQLite)
35–50	NewRequestForm	StatusBadge, SlaCountdown	escalation.py → push	GET /employees	models.py → push	seed.py
50–65	NewRequestForm done	TicketTable	POST /requests	GET /stats	Pair w/ D6 on conn string	Seed → Postgres, URL to chat
—	—	—	—	—	—	—
65–80	EmployeeDashboard	TicketTable + ⏩ button	GET /requests + filters	PATCH /status + manual log	DB on-call	README draft
80–95	StatCards	AdminQueue + filters	POST /{id}/age	PATCH /assign + auto-bump	Verify manual insert → API	README + troubleshooting
95–110	Responsive + loading states	EscalationTimeline	🔴 Duplicate-log check	GET /escalations	Support	⚠️ SQLite drill, timed
🚦 GATE 1 @ 65 min — 60-second check, no laptops:

D3: does POST /requests return 201 with a real id in Swagger?
D2: does client.js exist on feat-fe and is D1 importing from it cleanly?
D6: is seed.py green against Postgres — 12 rows visible in the Supabase Table Editor?
Any red → reassign a nearby dev to it right now. Do not carry a red past 65.
🚦 GATE 2 @ 105 min — D3+D4 run the full Swagger checklist (Doc 3 §7), steps 1–21.
All 21 green is the entry ticket to integration. Step 17 (no duplicate logs) is mandatory.

Phase 2 · 110–150 · Integration & End-to-End Testing
Min	Action	Who
110–115	MERGE WINDOW. D6 is merge captain. Order: feat-db → main, then feat-be → main, then feat-fe → main. Everyone else stops committing and watches.	D6 leads
115–120	Everyone git pull main. Backend runs on 8000 with real Supabase, frontend on 5173.	All
120–125	D2 flips USE_MOCKS = false first — before D1. Loads /admin. Diffs every response key against mocks.js. Reports all mismatches in one batched message.	D2 → D3/D4
125–135	D3/D4 fix the mismatch batch. D1 flips USE_MOCKS = false, verifies create + list.	D1, D3, D4
135–145	Full E2E, run twice, by two different people: switch to Priya → submit an oxygen request → switch to Dr. Rao → open /admin → find it at the top → assign Suresh (auto-bumps to In Progress) → click ⏩ 90 min → row goes red and pulses, timeline gains an entry → set Resolved → row goes green, drops out of breach.	D1+D2 driving
145–150	🔒 FEATURE FREEZE. No new features. Bug fixes and copy changes only.	All
🚦 GATE 3 @ 145 min — the E2E flow above completed twice with zero manual intervention. If it fails: cut the failing feature and demo the rest. Never debug past 150.

Phase 3 · 150–180 · Demo Polish & Rehearsal
Min	Action	Who
150–160	Copy polish, empty states, spacing, 🚨 glyphs, verify colours are legible on a projector (bump contrast if washed out)	D1, D2
160–165	Verify responsive at 1280px — the projector resolution, not your laptop's	D1
165–172	Full dress rehearsal #1 with a stopwatch. D2 drives the clicks, D5 narrates the architecture.	All
172–175	Fix whatever broke in rehearsal. Nothing else.	Owner of the break
175–177	🔄 python db/seed.py — fresh deterministic state. Hard-refresh both browser tabs. Do not click ⏩ after this.	D6
177–180	Rehearsal #2 — clicks only, no fixes. Assign speaking parts.	All
Speaking parts (each dev owns one answer):

D2 drives the demo and narrates the click path.
D3 answers "how does escalation work?" → compute-on-read, evaluate_sla(), no scheduler, deterministic.
D5 answers "walk us through the data model" → 3 tables, sla_minutes derived at insert, escalation_logs as an immutable audit trail.
D4 answers "show us the API" → /docs, live.
D6 answers "what if the database goes down?" → one env var, SQLite, 40 seconds. Already tested at minute 100.
D1 answers "how would this scale / what's next?" → real auth via the same X-User-Id seam, SMS paging on the escalated_to field, per-department SLA policy tables.
2. Milestone Gates — the one-page version
Gate	Min	Condition	If red
G0	20	RLS off ×3 verified · App.jsx + main.py frozen and pushed · contract read aloud	Whole team → SQLite. Don't wait on Supabase.
G1	65	POST /requests returns 201 · client.js on the FE branch · seed green on Postgres	Reassign the nearest free dev to the red item
G2	105	Swagger checklist 1–21 all green, incl. no-duplicate-logs	Delay the merge by 10 min max; cut a route if needed
G3	145	E2E flow completed twice, cleanly	Cut the failing feature; demo what works
G4	177	Rehearsal #2 done, fresh seed loaded, tabs refreshed	Simplify the click path
3. Git Strategy

main ─────●───────────────────────────●═══════●═══════●──────────► DEMO
          │ (min 5: .gitignore)       ↑       ↑       ↑
          ├── feat-db  (D5, D6) ──────┘       │       │   merge 1 @ 110
          ├── feat-be  (D3, D4) ──────────────┘       │   merge 2 @ 112
          └── feat-fe  (D1, D2) ──────────────────────┘   merge 3 @ 114
Rules — all six devs:

main at minute 5 contains only .gitignore, README.md stub, and the folder skeleton. Nobody commits directly to main before minute 110 except D6.
Three branches, two devs each, strictly non-overlapping files (§4). Pairs push to their shared branch every 15 minutes: git add -A && git commit -m "..." && git push.
Two devs on one branch touching different files means near-zero merge conflicts by construction. That is the point of the file-ownership table.
Merge order at minute 110 is feat-db → feat-be → feat-fe. Dependency order — models before routers, routers before the API client. Reversing it creates import errors that look like real bugs.
D6 is merge captain. Only D6 runs merge commands. Everyone else stops committing between 110 and 115 and watches D6's screen.
Conflict during the merge → whoever owns the file per §4 decides, in under 60 seconds. No discussion, no --theirs roulette.
git push --force is banned on main. Anyone can push force to their own feature branch.
Merge commands (D6, minute 110):


git checkout main && git pull

git merge feat-db --no-ff -m "merge: schema, models, seed"
cd backend && python -c "import models" && cd ..        # import smoke test

git merge feat-be --no-ff -m "merge: FastAPI routers, SLA engine"
cd backend && uvicorn main:app --port 8000 &            # boot smoke test
curl -s localhost:8000/health                           # {"status":"ok"}

git merge feat-fe --no-ff -m "merge: React UI"
cd frontend && npm run build                            # build smoke test

git push origin main
Smoke test between each merge. If merge 2 breaks the boot, you know it was feat-be and not a three-way mystery.

4. File Ownership Table — the conflict-prevention contract
No path appears twice. If you need to change a file you don't own, message the owner. Do not edit it.

Path	Branch	Owner	Frozen
.gitignore	main	D6	min 5
README.md	main	D6	—
db/001_init.sql	feat-db	D5	min 25
backend/models.py	feat-db	D5	min 45
db/seed.py	feat-db	D6	min 60
.env.example	feat-db	D6	min 15
backend/requirements.txt	feat-be	D4	min 10
backend/main.py	feat-be	D4	🔒 min 15
backend/db.py	feat-be	D4	min 15
backend/schemas.py	feat-be	D4	min 30
backend/routers/__init__.py	feat-be	D4	min 10
backend/routers/admin.py	feat-be	D4	—
backend/escalation.py	feat-be	D3	min 45
backend/routers/requests.py	feat-be	D3	—
frontend/src/main.jsx	feat-fe	D1	min 15
frontend/src/App.jsx	feat-fe	D1	🔒 min 15
frontend/src/layout/Header.jsx	feat-fe	D1	—
frontend/src/layout/UserSwitcher.jsx	feat-fe	D1	—
frontend/src/pages/EmployeeDashboard.jsx	feat-fe	D1	—
frontend/src/components/NewRequestForm.jsx	feat-fe	D1	—
frontend/src/components/StatCards.jsx	feat-fe	D1	—
frontend/tailwind.config.js, src/index.css, postcss.config.js	feat-fe	D1	min 20
frontend/src/api/client.js	feat-fe	D2	min 35
frontend/src/api/mocks.js	feat-fe	D2	min 30
frontend/src/constants.js	feat-fe	D2	min 25
frontend/src/pages/AdminQueue.jsx	feat-fe	D2	—
frontend/src/components/TicketTable.jsx	feat-fe	D2	—
frontend/src/components/StatusBadge.jsx	feat-fe	D2	—
frontend/src/components/SlaCountdown.jsx	feat-fe	D2	—
frontend/src/components/EscalationTimeline.jsx	feat-fe	D2	—
The two frozen files — backend/main.py and frontend/src/App.jsx — are the only genuinely shared surfaces in the codebase. Both are written complete at minute 15 with every router / route already registered against files that don't exist yet. After minute 15, neither file is opened by anyone. That single rule eliminates the merge conflict that kills most hackathon teams.

5. .gitignore — commit this before anything else

# ── Python ──
__pycache__/
*.py[cod]
.venv/
venv/
env/

# ── Secrets ──
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
D6, minute 0–5, exactly this order:


git init
printf '%s\n' '# see INTEGRATION_PLAN.md §5' > .gitignore   # then paste the block above
git add .gitignore
git commit -m "chore: gitignore before anything else"
git branch -M main
git remote add origin <repo-url>
git push -u origin main
git checkout -b feat-db  && git push -u origin feat-db
git checkout -b feat-be  && git push -u origin feat-be
git checkout -b feat-fe  && git push -u origin feat-fe
git checkout main
# ONLY NOW create .env
A Supabase password committed at minute 12 is still in the history at minute 180. Judges browse repos. .gitignore is commit #1, no exceptions.

6. Emergency Demo Defense Protocol
Rehearse both of these at minute 100. An untested fallback is not a fallback.

🔴 RED-1 — Supabase unreachable / Wi-Fi drops
Symptom: OperationalError in the uvicorn log, or the admin queue spins forever.
Owner: D6. Recovery: ~40 seconds.


# 1. backend/.env — swap one line
#    # DATABASE_URL=postgresql+psycopg2://...     ← comment out
#    DATABASE_URL=sqlite:///./dev.db              ← uncomment
# 2. restart uvicorn (Ctrl+C, up-arrow, Enter)
# 3. python db/seed.py      ← only if backend/dev.db is missing; it shouldn't be
# 4. hard-refresh the browser
backend/dev.db stays seeded on disk from the minute-100 drill, so step 3 is usually skippable.
Say to the room: "We designed the persistence layer to be engine-agnostic — same models, same ORM, one environment variable. That's a deliberate resilience choice, not a workaround." This gains credibility.

🔴 RED-2 — Backend down or a route 500s
Symptom: network errors in the console, or one table won't load.
Owner: D2. Recovery: ~5 seconds.


// frontend/src/api/client.js line 8
export const USE_MOCKS = true;   // save — Vite HMR reloads instantly
mocks.js implements evaluate(), so the ⏩ SLA breach demo still works fully offline. The mock layer escalates, logs, and re-sorts exactly like the server. The demo is complete either way.

🟡 AMBER-1 — Frontend build breaks at the worst moment
Owner: D2. Demo from http://localhost:8000/docs. Run Swagger checklist steps 3 → 6 → 10 → 19 → 20. Judges accept an API demo when it is narrated confidently and the architecture diagram is on screen.

🟡 AMBER-2 — Demo laptop's Wi-Fi dies entirely
Owner: D6. Both servers are localhost and SQLite is local. Zero network dependency in fallback mode. Switch to SQLite and carry on as if nothing happened.

🟡 AMBER-3 — Data looks wrong / someone clicked ⏩ during setup
Owner: D6. python db/seed.py, hard-refresh. 10 seconds, deterministic state restored. This is why seed.py wipes rather than upserts.

Standing pre-demo checklist (D6 runs it at minute 177):

 python db/seed.py just ran — output shows 12 requests · 3 escalation logs
 uvicorn log shows the intended engine (SUPABASE POSTGRES or SQLITE FALLBACK)
 USE_MOCKS is set to the intended value
 Two browser tabs open and hard-refreshed: localhost:5173 and localhost:5173/admin
 A third tab on localhost:8000/docs, ready in case a judge asks
 User switcher is on Priya Menon
 Nobody has clicked ⏩ since the seed
 Laptop on mains power, notifications silenced, browser zoom at 100%
7. The 2-Minute Demo Script
Driver: D2. Narrator: D3. Two tabs open. Rehearsed twice. Total 120 seconds.

[0:00–0:15] Frame the problem.
Say: "In a hospital, a maintenance ticket has a patient attached to it. A ventilator alarm and a broken office chair cannot sit in the same queue. SENTINEL attaches a life-criticality SLA to every request and escalates by itself when that SLA is breached."

[0:15–0:30] ① Employee raises a request.
Tab 1, localhost:5173. Header switcher already on Priya Menon · employee · ICU — Ward 3.
Click New Request. Type:

Title: Ward 3 oxygen flowmeter reading zero
Category: Oxygen Supply → point at the live hint: "escalates in 5 minutes"
Priority: Critical
Say: "The SLA isn't typed by the user — it's derived from the category at insert time. Oxygen gets five minutes. Office HVAC gets two hours."
Submit. The ticket appears in her list with a live countdown ticking down.

[0:30–0:50] ② Admin triages.
Switch the header to Dr. Anita Rao · admin. Navigate to /admin.
Say: "The admin queue sorts breached-first. Two life-critical tickets are already red — an ICU ventilator and a vaccine fridge at +8°C — because they blew their SLA before anyone opened this page."
Point at the four stat cards. Point at the new oxygen ticket near the top.

[0:50–1:05] ③ Assign — and note the automation.
On the oxygen ticket, open the Assign dropdown → Suresh Kumar · Biomedical Engineering.
Say: "Assigning a ticket auto-acknowledges it — Pending flips to In Progress in the same call. One click instead of two, because in an emergency nobody has a spare click."
The badge changes amber → blue on screen.

[1:05–1:35] ④ ⭐ THE LIVE SLA BREACH — the whole demo lands here.
Scroll to the Nurse station Wi-Fi down — EMR unreachable ticket. Pending, 60-minute SLA, ~45 minutes of headroom.
Say: "This ticket has 45 minutes left. Rather than ask you to wait 45 minutes —"
Click ⏩ Simulate SLA breach → 90 min.
On screen, in one round trip: badge flips to solid red Escalated · row starts pulsing red with a 🚨 glyph · countdown flips to +45:00 OVER in red · row jumps to the top of the queue · the escalation timeline on the right gains a new entry.
Say: "No scheduler, no cron, no background worker. Escalation is computed on read — every time the queue is fetched, the backend evaluates elapsed time against the SLA, flips the status, and writes an immutable audit row. Deterministic, and provable on demand."

[1:35–1:50] ⑤ The audit trail.
Point at the new timeline entry: "SLA breach — 105 min elapsed against a 60 min SLA (IT / Network) → escalated to Facility Admin — Vikram Nair."
Say: "Every escalation writes who it went to and why. In a real deployment this row is the page to the on-call biomedical technician. Nothing is escalated silently."

[1:50–2:00] ⑥ Close.
Say: "React, FastAPI, and Postgres. Three tables, nine endpoints, one SLA function. Employee raises, admin assigns, the system escalates on its own — end to end, and every piece of it is on this screen."
Leave the pulsing red row visible while answering questions.

Discipline rules:

Never click ⏩ before the demo. Ticket 6 is loaded and untouched.
Never apologise for scope. Cut features were decisions: say "we deliberately scoped auth out to spend the time on the escalation engine", not "we didn't have time for auth."
If a click fails, keep talking and move to the next beat. Silence reads as failure; narration reads as control.
Have the architecture Mermaid diagram open in a fourth tab for the inevitable "how is this built?"
