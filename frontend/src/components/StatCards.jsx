const CARD = "bg-white rounded-xl border border-slate-200 shadow-sm p-5";

export default function StatCards({ stats }) {
  if (!stats) return null;

  const cards = [
    { label: "Open", value: stats.pending + stats.in_progress, accent: "text-slate-900" },
    { label: "In Progress", value: stats.in_progress, accent: "text-blue-700" },
    { label: "Escalated", value: stats.escalated, accent: "text-red-700" },
    { label: "Critical Open", value: stats.critical_open, accent: "text-orange-700" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className={CARD}>
          <div className={`text-3xl font-bold tabular-nums ${c.accent}`}>{c.value}</div>
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500 mt-1">
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}
