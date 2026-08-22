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

export const LIFE_CRITICAL = ["Life Support", "Oxygen Supply", "Cold Chain / Vaccine", "ER Power"];

export const DEPARTMENTS = [
  "ICU", "Emergency (ER)", "Operating Theatre", "Neonatal (NICU)",
  "General Ward", "Radiology", "Pathology Lab", "Pharmacy",
  "Blood Bank", "Nurse Station", "Facilities / Engineering",
];

export const FLOORS = [
  "Ground Floor", "Floor 1", "Floor 2", "Floor 3", "Floor 4", "Basement — Utilities",
];

export const EQUIPMENT_SUGGESTIONS = [
  "Ventilator — Dräger Savina 300",
  "Patient Monitor — Philips IntelliVue MX450",
  "Defibrillator — Zoll R Series",
  "Infusion Pump — B. Braun Infusomat",
  "Vaccine Refrigerator — Haier Biomedical HYC-610",
  "Oxygen Manifold — Central Supply Line 2",
  "Backup Generator — ER ATS Unit",
  "Network Switch — Ward 3 Core Switch",
  "Surgical Light — OT-2 Overhead Array",
  "HVAC Air Handler — AHU-04",
];

export const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
