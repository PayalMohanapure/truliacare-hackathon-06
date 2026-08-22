# FRONTEND ROADMAP — Dev 1 & Dev 2
React 18 · Vite · Tailwind CSS · Axios · port **5173**

---

## 1. File Ownership — zero overlap, enforced

| Path | Owner | Frozen at |
|---|---|---|
| `src/main.jsx` | **Dev 1** | min 15 |
| `src/App.jsx` (router + `currentUser` state) | **Dev 1** | **min 15 — FROZEN** |
| `src/layout/Header.jsx` | Dev 1 | — |
| `src/layout/UserSwitcher.jsx` | Dev 1 | — |
| `src/pages/EmployeeDashboard.jsx` | Dev 1 | — |
| `src/components/NewRequestForm.jsx` | Dev 1 | — |
| `src/components/StatCards.jsx` | Dev 1 | — |
| `tailwind.config.js`, `src/index.css`, `postcss.config.js` | **Dev 1** | min 20 |
| `src/pages/AdminQueue.jsx` | **Dev 2** | — |
| `src/components/TicketTable.jsx` | Dev 2 | — |
| `src/components/StatusBadge.jsx` | Dev 2 | — |
| `src/components/SlaCountdown.jsx` | Dev 2 | — |
| `src/components/EscalationTimeline.jsx` | Dev 2 | — |
| `src/api/client.js` | **Dev 2** | min 35 (Dev 1 consumes, never edits) |
| `src/api/mocks.js` | **Dev 2** | min 30 |
| `src/constants.js` (categories, statuses, priorities) | **Dev 2** | min 25 |

> **`App.jsx` is the only file both devs depend on.** Dev 1 writes it complete — both routes, `currentUser` state, `Header` mounted — inside the first 15 minutes and pushes it. After that it is frozen. Dev 2 never opens it.

---

## 2. Component Tree with State Boundaries

```
App.jsx                                    ◆ STATEFUL — owns currentUser + employees[]
│   const [currentUser, setCurrentUser]     ← the ONE global piece of state
│   const [employees, setEmployees]         ← fetched once on mount
│   useEffect: getEmployees() → setEmployees(list); setCurrentUser(list[0])
│   client.setCurrentUser(currentUser.id)   ← pushes id into the Axios interceptor
│
├── Header.jsx                             ○ presentational
│     props: currentUser, employees, onUserChange
│     └── UserSwitcher.jsx                 ○ presentational — controlled <select>
│           props: employees, value, onChange
│           renders "Priya Menon · employee · ICU — Ward 3"
│
└── <Routes>
    │
    ├── "/"  EmployeeDashboard.jsx         ◆ STATEFUL — owns myRequests[]
    │     const [myRequests, setMyRequests]
    │     const [loading, setLoading]
    │     useEffect([currentUser.id]) → listRequests({ employee_id })
    │     useEffect: setInterval(refresh, 10000)   ← 10s poll, cleared on unmount
    │     │
    │     ├── NewRequestForm.jsx           ◆ LOCAL FORM STATE ONLY
    │     │     local: title, description, category, priority
    │     │     props: onCreated  → parent refetches. Form owns NO list state.
    │     │
    │     └── TicketTable.jsx  (mode="employee")   ○ presentational — Dev 2's component
    │
    └── "/admin"  AdminQueue.jsx           ◆ STATEFUL — owns requests[], stats, filters, selectedId
          const [requests, setRequests]
          const [stats, setStats]
          const [filters, setFilters]      // { status: "", category: "" }
          const [selectedId, setSelectedId]
          useEffect([filters]) → listRequests(filters) + getStats()
          useEffect: setInterval(refresh, 10000)
          handlers: onStatusChange · onAssign · onAge  → await API → refresh()
          │
          ├── StatCards.jsx                ○ presentational — props: stats
          ├── FilterBar (inline in AdminQueue, not a file)
          ├── TicketTable.jsx (mode="admin")        ○ presentational
          │     props: requests, employees, mode, onStatusChange, onAssign, onAge, onSelect
          │     ├── StatusBadge.jsx        ○ pure — props: status
          │     └── SlaCountdown.jsx       ◐ LOCAL TICKER ONLY
          │           props: minutesRemaining, isBreached, fetchedAt
          │           local: useState(tick) + setInterval(1000) — display only,
          │                 never mutates or refetches parent data
          │
          └── EscalationTimeline.jsx       ◆ SELF-FETCHING LEAF
                props: requestId (nullable)
                local: const [logs, setLogs]
                useEffect([requestId]) → listEscalations({ request_id: requestId })
                requestId === null → fetches the global feed (all escalations)
```

**The rules, stated once:**
- `App.jsx` owns `currentUser`. Nothing else does.
- Each **page** owns its own list state and its own poll timer. Pages never share state with each other.
- `TicketTable`, `StatusBadge`, `StatCards`, `UserSwitcher`, `Header` are **pure** — props in, JSX out, zero fetching.
- `SlaCountdown` holds a local 1-second tick for the display only. It never triggers a network call.
- `EscalationTimeline` is the single exception: a self-fetching leaf, because it is the only thing that needs `/api/escalations` and wiring it through two parents costs more than it saves.
- **No Redux, no Zustand, no Context, no React Query.** `useState` + `useEffect` + prop drilling. Depth is 3.

---

## 3. `src/api/client.js` — Dev 2, written FIRST (minutes 20–35)

This file is the frontend's entire view of the backend. Dev 1 imports from it and never edits it.

```js
// src/api/client.js — OWNER: Dev 2. Do not edit if you are not Dev 2.
import axios from "axios";
import * as mocks from "./mocks";

// ── EMERGENCY SWITCH ───────────────────────────────────────────
// true  = 100% offline, served from mocks.js. Backend not required.
// false = live FastAPI. Flip to false at minute 110.
export const USE_MOCKS = true;
// ───────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

let CURRENT_USER_ID = 5;
export const setCurrentUser = (id) => { CURRENT_USER_ID = id; };

const http = axios.create({ baseURL: BASE_URL, timeout: 8000 });

http.interceptors.request.use((cfg) => {
  cfg.headers["X-User-Id"] = CURRENT_USER_ID;   // every call, automatically
  return cfg;
});

// Every backend error becomes a plain string. Callers never touch err.response.
http.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(
    new Error(err.response?.data?.error || err.message || "Network error")
  )
);

const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));

// ── ENDPOINTS — one function per route in the contract ─────────

export async function getEmployees(params = {}) {
  if (USE_MOCKS) { await delay(); return mocks.mockEmployees(params); }
  return (await http.get("/api/employees", { params })).data;
}

export async function createRequest(payload) {
  // payload = { title, description, category, priority }
  // NOTE: employee_id is NOT sent — the server reads X-User-Id.
  if (USE_MOCKS) { await delay(); return mocks.mockCreateRequest(payload, CURRENT_USER_ID); }
  return (await http.post("/api/requests", payload)).data;
}

export async function listRequests(params = {}) {
  // params = { status?, category?, employee_id?, assigned_to? }
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v != null)
  );
  if (USE_MOCKS) { await delay(); return mocks.mockListRequests(clean); }
  return (await http.get("/api/requests", { params: clean })).data;
}

export async function getRequest(id) {
  if (USE_MOCKS) { await delay(); return mocks.mockGetRequest(id); }
  return (await http.get(`/api/requests/${id}`)).data;
}

export async function ageRequest(id, minutes) {
  if (USE_MOCKS) { await delay(); return mocks.mockAgeRequest(id, minutes); }
  return (await http.post(`/api/requests/${id}/age`, null, { params: { minutes } })).data;
}

export async function updateStatus(id, status) {
  if (USE_MOCKS) { await delay(); return mocks.mockUpdateStatus(id, status); }
  return (await http.patch(`/api/requests/${id}/status`, { status })).data;
}

export async function assignRequest(id, assigned_to) {
  if (USE_MOCKS) { await delay(); return mocks.mockAssign(id, assigned_to); }
  return (await http.patch(`/api/requests/${id}/assign`, { assigned_to })).data;
}

export async function listEscalations(params = {}) {
  if (USE_MOCKS) { await delay(); return mocks.mockListEscalations(params); }
  return (await http.get("/api/escalations", { params })).data;
}

export async function getStats() {
  if (USE_MOCKS) { await delay(); return mocks.mockStats(); }
  return (await http.get("/api/stats")).data;
}
```

---

## 4. `src/api/mocks.js` — key-for-key identical to the contract

Dev 2 writes this before writing a single component. **Every key here matches SPDD §6.1 exactly.** If the mock and the real response disagree on one key name, integration at minute 110 breaks and you will not find it fast.

```js
// src/api/mocks.js — OWNER: Dev 2
// Mutable in-memory store so the mocked app actually behaves like an app.

export const EMPLOYEES = [
  { id: 1, name: "Dr. Anita Rao", role: "admin",      department: "Hospital Administration" },
  { id: 2, name: "Vikram Nair",   role: "admin",      department: "Facility Management" },
  { id: 3, name: "Suresh Kumar",  role: "technician", department: "Biomedical Engineering" },
  { id: 4, name: "Farah Sheikh",  role: "technician", department: "Electrical & HVAC" },
  { id: 5, name: "Priya Menon",   role: "employee",   department: "ICU — Ward 3" },
  { id: 6, name: "Rahul Das",     role: "employee",   department: "Pathology Lab" },
];

const nameOf = (id) => EMPLOYEES.find((e) => e.id === id)?.name ?? null;

// helper: an ISO string `minsAgo` minutes in the past
const iso = (minsAgo) => new Date(Date.now() - minsAgo * 60000).toISOString().slice(0, 19);

const mk = (o) => ({
  description: "", assigned_to: null, ...o,
  employee_name: nameOf(o.employee_id),
  assigned_to_name: nameOf(o.assigned_to ?? null),
  created_at: iso(o.age),
  updated_at: iso(Math.max(0, o.age - 2)),
  age_minutes: o.age,
  minutes_remaining: o.sla_minutes - o.age,
  is_breached: o.sla_minutes - o.age < 0 && !["Resolved", "Closed"].includes(o.status),
});

export let REQUESTS = [
  mk({ id: 1, employee_id: 5, title: "ICU Bed 4 ventilator alarm — low tidal volume",
       description: "Continuous low tidal volume alarm on Bed 4. Patient is vent-dependent.",
       category: "Life Support", priority: "Critical", status: "Escalated",
       sla_minutes: 5, assigned_to: 3, age: 22 }),
  mk({ id: 2, employee_id: 6, title: "Vaccine fridge #2 temperature drift — reading +8°C",
       description: "Cold chain unit 2 holding at +8°C against a +2 to +8 spec ceiling. ~400 doses at risk.",
       category: "Cold Chain / Vaccine", priority: "Critical", status: "Escalated",
       sla_minutes: 10, age: 35 }),
  mk({ id: 3, employee_id: 5, title: "ER backup generator fails auto-transfer test",
       description: "Weekly ATS test did not transfer load. ER on utility power only.",
       category: "ER Power", priority: "Critical", status: "In Progress",
       sla_minutes: 10, assigned_to: 4, age: 6 }),
  mk({ id: 4, employee_id: 5, title: "Central oxygen manifold pressure dropping in Ward 3",
       description: "Line pressure 2.8 bar against a 4.0 bar spec. Two patients on O2.",
       category: "Oxygen Supply", priority: "Critical", status: "Pending",
       sla_minutes: 5, age: 1 }),
  mk({ id: 5, employee_id: 5, title: "OT-2 surgical lighting flickers mid-procedure",
       description: "Overhead surgical lamp in Operating Theatre 2 flickering under load.",
       category: "Facilities / HVAC", priority: "High", status: "In Progress",
       sla_minutes: 120, assigned_to: 4, age: 40 }),
  mk({ id: 6, employee_id: 6, title: "Nurse station Wi-Fi down — EMR unreachable",
       description: "Ward 3 nurse station cannot reach the EMR. Charting on paper.",
       category: "IT / Network", priority: "High", status: "Pending",
       sla_minutes: 60, age: 15 }),
  mk({ id: 7, employee_id: 6, title: "Pathology lab HVAC not holding 18°C",
       description: "Lab ambient at 26°C. Analyser calibration drifting.",
       category: "Facilities / HVAC", priority: "Medium", status: "In Progress",
       sla_minutes: 120, assigned_to: 4, age: 90 }),
  mk({ id: 8, employee_id: 5, title: "Infusion pump #7 battery not holding charge",
       description: "Pump drops to mains-only within 4 minutes of unplugging.",
       category: "Life Support", priority: "High", status: "Resolved",
       sla_minutes: 5, assigned_to: 3, age: 180 }),
  mk({ id: 9, employee_id: 6, title: "Blood bank fridge door seal worn",
       description: "Gasket on blood bank unit 1 no longer seating. Condensation on inner wall.",
       category: "Cold Chain / Vaccine", priority: "Medium", status: "Resolved",
       sla_minutes: 10, assigned_to: 3, age: 240 }),
  mk({ id: 10, employee_id: 6, title: "Radiology PACS workstation will not boot",
       description: "Reporting workstation 2 stuck on POST. Radiologist queue backing up.",
       category: "IT / Network", priority: "Medium", status: "Pending",
       sla_minutes: 60, age: 30 }),
  mk({ id: 11, employee_id: 5, title: "ICU ceiling AC unit leaking near monitor cart",
       description: "Condensate dripping within 40cm of a live patient monitor cart.",
       category: "Facilities / HVAC", priority: "High", status: "Pending",
       sla_minutes: 120, age: 10 }),
  mk({ id: 12, employee_id: 5, title: "ER corridor emergency lighting circuit tripped",
       description: "Corridor C emergency luminaires dark. Breaker reset held.",
       category: "ER Power", priority: "High", status: "Resolved",
       sla_minutes: 10, assigned_to: 4, age: 300 }),
];

export let ESCALATIONS = [
  { id: 1, request_id: 1, request_title: REQUESTS[0].title, category: "Life Support",
    from_status: "Pending", to_status: "Escalated",
    reason: "SLA breach — 22 min elapsed against a 5 min SLA (Life Support)",
    escalated_to: "Biomedical On-Call — Suresh Kumar", created_at: iso(17) },
  { id: 2, request_id: 2, request_title: REQUESTS[1].title, category: "Cold Chain / Vaccine",
    from_status: "Pending", to_status: "Escalated",
    reason: "SLA breach — 35 min elapsed against a 10 min SLA (Cold Chain / Vaccine)",
    escalated_to: "Facility Admin — Vikram Nair", created_at: iso(25) },
  { id: 3, request_id: 1, request_title: REQUESTS[0].title, category: "Life Support",
    from_status: "Escalated", to_status: "Escalated",
    reason: "Manual flag by Dr. Anita Rao — patient is vent-dependent, no acknowledgement in 15 min",
    escalated_to: "Chief Medical Officer", created_at: iso(4) },
];

const SLA = { "Life Support": 5, "Oxygen Supply": 5, "Cold Chain / Vaccine": 10,
              "ER Power": 10, "IT / Network": 60, "Facilities / HVAC": 120 };
const TARGET = { "Life Support": "Biomedical On-Call — Suresh Kumar",
                 "Oxygen Supply": "Biomedical On-Call — Suresh Kumar",
                 "Cold Chain / Vaccine": "Facility Admin — Vikram Nair",
                 "ER Power": "Electrical On-Call — Farah Sheikh",
                 "IT / Network": "Facility Admin — Vikram Nair",
                 "Facilities / HVAC": "Facility Admin — Vikram Nair" };

const PRIO = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const sortRows = (rows) => [...rows].sort((a, b) =>
  (b.is_breached - a.is_breached) || (PRIO[a.priority] - PRIO[b.priority]) ||
  a.created_at.localeCompare(b.created_at));

// mirrors evaluate_sla() on the server — mocks escalate too, so the demo works offline
function evaluate() {
  for (const r of REQUESTS) {
    if (["Resolved", "Closed", "Escalated"].includes(r.status)) continue;
    if (r.minutes_remaining < 0) {
      ESCALATIONS.unshift({
        id: ESCALATIONS.length + 1, request_id: r.id, request_title: r.title,
        category: r.category, from_status: r.status, to_status: "Escalated",
        reason: `SLA breach — ${r.age_minutes} min elapsed against a ${r.sla_minutes} min SLA (${r.category})`,
        escalated_to: TARGET[r.category], created_at: iso(0),
      });
      r.status = "Escalated";
      r.is_breached = true;
    }
  }
}

export const mockEmployees = (p = {}) =>
  p.role ? EMPLOYEES.filter((e) => e.role === p.role) : EMPLOYEES;

export function mockListRequests(f = {}) {
  evaluate();
  return sortRows(REQUESTS.filter((r) =>
    (!f.status || r.status === f.status) &&
    (!f.category || r.category === f.category) &&
    (!f.employee_id || r.employee_id === Number(f.employee_id)) &&
    (!f.assigned_to || r.assigned_to === Number(f.assigned_to))));
}

export function mockGetRequest(id) {
  evaluate();
  const r = REQUESTS.find((x) => x.id === Number(id));
  if (!r) throw new Error(`Request ${id} not found`);
  return r;
}

export function mockCreateRequest(p, userId) {
  if (!SLA[p.category]) throw new Error(`Unknown category '${p.category}'`);
  const row = mk({ id: Math.max(...REQUESTS.map((r) => r.id)) + 1,
    employee_id: userId, title: p.title, description: p.description || "",
    category: p.category, priority: p.priority || "Medium",
    status: "Pending", sla_minutes: SLA[p.category], age: 0 });
  REQUESTS.push(row);
  return row;
}

export function mockAgeRequest(id, minutes) {
  const r = mockGetRequest(id);
  r.age_minutes += Number(minutes);
  r.created_at = iso(r.age_minutes);
  r.minutes_remaining = r.sla_minutes - r.age_minutes;
  evaluate();
  return r;
}

export function mockUpdateStatus(id, status) {
  const r = mockGetRequest(id);
  r.status = status;
  r.updated_at = iso(0);
  r.is_breached = r.minutes_remaining < 0 && !["Resolved", "Closed"].includes(status);
  return r;
}

export function mockAssign(id, assigned_to) {
  const r = mockGetRequest(id);
  r.assigned_to = assigned_to;
  r.assigned_to_name = nameOf(assigned_to);
  if (r.status === "Pending" && assigned_to) r.status = "In Progress";
  r.updated_at = iso(0);
  return r;
}

export function mockListEscalations(p = {}) {
  evaluate();
  return p.request_id
    ? ESCALATIONS.filter((e) => e.request_id === Number(p.request_id))
    : ESCALATIONS;
}

export function mockStats() {
  evaluate();
  const c = (s) => REQUESTS.filter((r) => r.status === s).length;
  const total = REQUESTS.length, esc = c("Escalated");
  return { total, pending: c("Pending"), in_progress: c("In Progress"),
    resolved: c("Resolved"), escalated: esc,
    critical_open: REQUESTS.filter((r) => r.priority === "Critical" &&
      !["Resolved", "Closed"].includes(r.status)).length,
    breached_open: REQUESTS.filter((r) => r.is_breached).length,
    breach_rate_pct: total ? Math.round((esc / total) * 1000) / 10 : 0 };
}
```

---

## 5. `src/constants.js` — Dev 2, minute 25

```js
export const CATEGORIES = [
  { value: "Life Support",         label: "Life Support",         sla: 5,   tier: "critical" },
  { value: "Oxygen Supply",        label: "Oxygen Supply",        sla: 5,   tier: "critical" },
  { value: "Cold Chain / Vaccine", label: "Cold Chain / Vaccine", sla: 10,  tier: "critical" },
  { value: "ER Power",             label: "ER Power",             sla: 10,  tier: "critical" },
  { value: "IT / Network",         label: "IT / Network",         sla: 60,  tier: "standard" },
  { value: "Facilities / HVAC",    label: "Facilities / HVAC",    sla: 120, tier: "standard" },
];

export const STATUSES   = ["Pending", "In Progress", "Resolved", "Escalated"];
export const PRIORITIES = ["Low", "Medium", "High", "Critical"];

// tier === "critical" → these rows get the red pulse when breached
export const LIFE_CRITICAL = ["Life Support", "Oxygen Supply", "Cold Chain / Vaccine", "ER Power"];
```

> **UX win, 4 lines of code:** `NewRequestForm` shows the SLA next to the selected category live — *"Life Support → escalates in 5 minutes"*. Judges see the tiering without you explaining it.

---

## 6. Tailwind Recipes

### 6.1 `tailwind.config.js` — Dev 1, minute 20, then frozen

```js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      keyframes: {
        "breach-pulse": {
          "0%, 100%": { backgroundColor: "rgb(254 242 242)", boxShadow: "inset 4px 0 0 rgb(220 38 38)" },
          "50%":       { backgroundColor: "rgb(254 226 226)", boxShadow: "inset 6px 0 0 rgb(153 27 27)" },
        },
        "siren": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.35" },
        },
      },
      animation: {
        "breach-pulse": "breach-pulse 1.6s ease-in-out infinite",
        "siren": "siren 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
```

### 6.2 `StatusBadge.jsx` — the four badges

```jsx
// src/components/StatusBadge.jsx — OWNER: Dev 2
const BASE = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 " +
             "text-xs font-semibold tracking-wide ring-1 ring-inset whitespace-nowrap";

const STYLES = {
  "Pending":     "bg-amber-50   text-amber-800   ring-amber-300",
  "In Progress": "bg-blue-50    text-blue-800    ring-blue-300",
  "Resolved":    "bg-emerald-50 text-emerald-800 ring-emerald-300",
  "Escalated":   "bg-red-600    text-white       ring-red-700 shadow-sm shadow-red-300",
  "Closed":      "bg-slate-100  text-slate-600   ring-slate-300",
};

const DOT = {
  "Pending":     "bg-amber-500",
  "In Progress": "bg-blue-500",
  "Resolved":    "bg-emerald-500",
  "Escalated":   "bg-white animate-siren",   // the badge's own heartbeat
  "Closed":      "bg-slate-400",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`${BASE} ${STYLES[status] ?? STYLES["Closed"]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status] ?? DOT["Closed"]}`} />
      {status}
    </span>
  );
}
```

| Status | Look | Class string |
|---|---|---|
| **Pending** | soft amber pill, still dot | `bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-300` |
| **In Progress** | soft blue pill, still dot | `bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-300` |
| **Resolved** | soft green pill, still dot | `bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-300` |
| **Escalated** | **solid red, white text, blinking white dot** | `bg-red-600 text-white ring-1 ring-inset ring-red-700 shadow-sm shadow-red-300` |

Escalated is the only **solid-fill** badge in the whole app. It reads as an alarm from across the room — which is the point.

### 6.3 Breached life-critical row treatment

```jsx
// inside TicketTable.jsx — the <tr> className
import { LIFE_CRITICAL } from "../constants";

const rowClass = (r) => {
  if (r.is_breached && LIFE_CRITICAL.includes(r.category))
    return "animate-breach-pulse border-l-4 border-red-600";      // 🚨 life-critical breach
  if (r.is_breached)
    return "bg-red-50/70 border-l-4 border-red-400";               // breached, non-critical
  if (r.priority === "Critical")
    return "bg-orange-50/50 border-l-4 border-orange-400";         // critical, still in SLA
  return "border-l-4 border-transparent hover:bg-slate-50";
};
```

Add a 🚨 glyph before the title when `is_breached && LIFE_CRITICAL.includes(category)`. Free drama, one conditional.

### 6.4 `SlaCountdown.jsx` — the ticking clock

**The trap:** never `new Date(created_at)`. The backend sends naive timestamps and JS will parse them as *local* time, shifting your countdown by your UTC offset — a bug that looks like "the SLA logic is broken" and eats 20 minutes at minute 130.

```jsx
// src/components/SlaCountdown.jsx — OWNER: Dev 2
import { useEffect, useState } from "react";

export default function SlaCountdown({ minutesRemaining, isBreached, fetchedAt }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // server truth + seconds elapsed locally since that payload arrived. No date parsing.
  const elapsed = Math.floor((Date.now() - fetchedAt) / 1000);
  const secs = Math.round(minutesRemaining * 60) - elapsed;
  const over = secs < 0;
  const a = Math.abs(secs);
  const label = `${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;

  const tone = over || isBreached
    ? "text-red-700 bg-red-100 animate-siren"
    : secs < 120 ? "text-orange-700 bg-orange-100"
    : secs < 600 ? "text-amber-700 bg-amber-50"
    : "text-slate-600 bg-slate-100";

  return (
    <span className={`font-mono text-xs font-bold px-2 py-1 rounded tabular-nums ${tone}`}>
      {over || isBreached ? `+${label} OVER` : `${label} left`}
    </span>
  );
}
```

Pages set `fetchedAt` alongside their data:

```js
const [requests, setRequests] = useState([]);
const [fetchedAt, setFetchedAt] = useState(Date.now());
// in the fetcher: setRequests(data); setFetchedAt(Date.now());
```

### 6.5 Page shell recipes (Dev 1 owns, both devs match)

| Element | Classes |
|---|---|
| App shell | `min-h-screen bg-slate-50 text-slate-900 antialiased` |
| Header bar | `sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm` |
| Brand mark | `text-lg font-bold tracking-tight text-slate-900` + `<span className="text-red-600">●</span> SENTINEL` |
| Page container | `mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6` |
| Card | `bg-white rounded-xl border border-slate-200 shadow-sm p-5` |
| Stat card value | `text-3xl font-bold tabular-nums` |
| Stat card label | `text-xs font-medium uppercase tracking-wider text-slate-500` |
| Table wrapper | `overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm` |
| Table head | `bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500` |
| Table cell | `px-4 py-3 text-sm align-middle` |
| Row divider | `divide-y divide-slate-100` |
| Primary button | `rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40 transition` |
| Danger / age button | `rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 transition` |
| Select / input | `rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none` |
| Timeline node | `relative pl-6 pb-4 border-l-2 border-red-200 last:border-transparent` + dot `absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-red-500 ring-4 ring-red-100` |
| Responsive grid | `grid grid-cols-2 lg:grid-cols-4 gap-4` |

---

## 7. Dev 1 — Minute-by-Minute

| Time | Task | Gate |
|---|---|---|
| 0–10 | `npm create vite@latest frontend -- --template react` · `npm i axios react-router-dom` · `npm i -D tailwindcss postcss autoprefixer` · `npx tailwindcss init -p` | Vite dev server up on 5173 |
| 10–20 | `tailwind.config.js` (§6.1) + `index.css` directives. **Write `App.jsx` complete with both routes + `currentUser` state + `Header` mounted.** Push it. | 🔒 **`App.jsx` FROZEN + pushed** |
| 20–35 | `Header.jsx` + `UserSwitcher.jsx` against `mocks.EMPLOYEES` imported directly (Dev 2's `client.js` may not exist yet) | Switching the dropdown logs the new id |
| 35–55 | `NewRequestForm.jsx` — controlled inputs, category `<select>` from `CATEGORIES`, live "escalates in N minutes" hint, submit → `createRequest()` | Submitting appends a row in mocks |
| 55–80 | `EmployeeDashboard.jsx` — `listRequests({ employee_id })`, 10s poll, empty state, `<TicketTable mode="employee">` | Switching user changes the visible list |
| 80–95 | `StatCards.jsx` from `getStats()` — 4 cards: Open · In Progress · Escalated · Critical Open | Cards render real mock numbers |
| 95–110 | Responsive pass (`sm:` / `lg:` breakpoints), loading skeletons, error toast strip, favicon + page title | No horizontal scroll at 375px |
| 110–150 | **INTEGRATION** — `USE_MOCKS = false`, verify create + list against the live API, fix key mismatches | Live create works end-to-end |
| 150–180 | Demo polish, hospital-plausible copy, rehearse | — |

## 8. Dev 2 — Minute-by-Minute

| Time | Task | Gate |
|---|---|---|
| 0–20 | Read the SPDD API contract twice. Draft `constants.js`. | Contract understood cold |
| 20–35 | **`client.js` complete (§3) + `mocks.js` complete (§4).** Push immediately. | 🔒 **`client.js` FROZEN + pushed — Dev 1 unblocked** |
| 35–45 | `StatusBadge.jsx` + `SlaCountdown.jsx` | Countdown visibly ticks; escalated badge blinks |
| 45–75 | `TicketTable.jsx` — dual `mode`, breach-first ordering, row classes (§6.3), admin action cells: status `<select>`, assign `<select>`, `⏩ Simulate SLA breach` button | Clicking ⏩ in mock mode flips a row red on screen |
| 75–95 | `AdminQueue.jsx` — filters, 10s poll, `StatCards`, handlers wired, row click sets `selectedId` | Filter by `Escalated` returns exactly the escalated rows |
| 95–110 | `EscalationTimeline.jsx` — side panel, global feed when nothing selected, per-request feed when selected, reason + `escalated_to` + relative time | Timeline gains an entry after clicking ⏩ |
| 110–150 | **INTEGRATION** — flip `USE_MOCKS = false` **first, before Dev 1**, diff every response key against the mock. Report mismatches to Dev 3/4 in one batch message, not one at a time. | Every route returns live data |
| 150–180 | Own the `⏩` demo beat. Rehearse it 5×. | Breach lands within 2s, every time |

---

## 9. Frontend Failure Playbook

| Symptom | Fix |
|---|---|
| CORS error in console | Dev 4's problem — `allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]` on `CORSMiddleware`. `X-User-Id` is a custom header; without `allow_headers=["*"]` the preflight fails. |
| `X-User-Id` missing on requests | `client.setCurrentUser(id)` not called from `App.jsx`'s `useEffect` on `currentUser` change |
| Countdown off by hours | Someone parsed `created_at`. Delete that line. Use `minutes_remaining`. |
| Backend unreachable mid-demo | `USE_MOCKS = true`, save, Vite HMR reloads. ~1 second. |
| Poll storm / flicker | One `setInterval` per **page**, cleared in the effect's return. Never one per row. |
| Escalated badge not blinking | `animate-siren` needs the keyframes in `tailwind.config.js`; restart the Vite dev server after editing that file. |
