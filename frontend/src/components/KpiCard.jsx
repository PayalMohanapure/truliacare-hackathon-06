export default function KpiCard({ label, value, accent = "text-slate-900", sublabel }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className={`text-3xl font-bold tabular-nums ${accent}`}>{value}</div>
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500 mt-1">
        {label}
      </div>
      {sublabel && <div className="text-[11px] text-slate-400 mt-1">{sublabel}</div>}
    </div>
  );
}
