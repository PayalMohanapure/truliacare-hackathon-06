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
