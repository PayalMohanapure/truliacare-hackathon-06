import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";
import SlaCountdown from "./SlaCountdown";
import { LIFE_CRITICAL } from "../constants";

export default function TicketCard({ r, fetchedAt, footer }) {
  const critical = r.is_breached && LIFE_CRITICAL.includes(r.category);

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm p-4 space-y-2 ${
        critical ? "border-red-400 animate-breach-pulse" : r.is_breached ? "border-red-300" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link to={`/ops/queue/${r.id}`} className="text-sm font-semibold text-slate-900 hover:underline leading-snug">
          {critical && "🚨 "}{r.title}
        </Link>
        <span className="text-[11px] text-slate-400 whitespace-nowrap">#{r.id}</span>
      </div>
      <div className="text-xs text-slate-500">{r.category}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={r.priority} />
        <StatusBadge status={r.status} />
      </div>
      <div className="flex items-center justify-between pt-1">
        <SlaCountdown minutesRemaining={r.minutes_remaining} isBreached={r.is_breached} fetchedAt={fetchedAt} />
        <span className="text-[11px] text-slate-400">{r.assigned_to_name ?? "Unassigned"}</span>
      </div>
      {footer && <div className="pt-1">{footer}</div>}
    </div>
  );
}
