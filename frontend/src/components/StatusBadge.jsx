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
  "Escalated":   "bg-white animate-siren",
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
