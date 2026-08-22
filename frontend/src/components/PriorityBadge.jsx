const BASE = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 " +
             "text-xs font-semibold tracking-wide ring-1 ring-inset whitespace-nowrap";

const STYLES = {
  "Low":      "bg-emerald-50 text-emerald-800 ring-emerald-300",
  "Medium":   "bg-amber-50   text-amber-800   ring-amber-300",
  "High":     "bg-orange-50  text-orange-800  ring-orange-300",
  "Critical": "bg-red-600    text-white       ring-red-700 shadow-sm shadow-red-300",
};

const DOT = {
  "Low":      "bg-emerald-500",
  "Medium":   "bg-amber-500",
  "High":     "bg-orange-500",
  "Critical": "bg-white animate-siren",
};

export default function PriorityBadge({ priority }) {
  return (
    <span className={`${BASE} ${STYLES[priority] ?? STYLES["Medium"]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[priority] ?? DOT["Medium"]}`} />
      {priority}
    </span>
  );
}
