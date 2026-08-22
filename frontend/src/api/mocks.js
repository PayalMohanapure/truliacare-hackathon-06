// src/api/mocks.js
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
