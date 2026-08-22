import { useState } from "react";
import StatusBadge from "./StatusBadge";
import SlaCountdown from "./SlaCountdown";
import { STATUSES, LIFE_CRITICAL } from "../constants";

const rowClass = (r) => {
  if (r.is_breached && LIFE_CRITICAL.includes(r.category))
    return "animate-breach-pulse border-l-4 border-red-600";
  if (r.is_breached)
    return "bg-red-50/70 border-l-4 border-red-400";
  if (r.priority === "Critical")
    return "bg-orange-50/50 border-l-4 border-orange-400";
  return "border-l-4 border-transparent hover:bg-slate-50";
};

const selectClass = "rounded-lg border border-slate-300 px-2 py-1 text-xs " +
  "focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none bg-white";

const ageBtnClass = "rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 " +
  "ring-1 ring-red-200 hover:bg-red-100 transition disabled:opacity-40 whitespace-nowrap shrink-0";

export default function TicketTable({
  requests, employees = [], mode, fetchedAt,
  onStatusChange, onAssign, onAge, onSelect, selectedId,
}) {
  const [agingId, setAgingId] = useState(null);
  const technicians = employees.filter((e) => e.role === "technician" || e.role === "admin");

  async function handleAge(id) {
    setAgingId(id);
    try {
      await onAge?.(id, 6);
    } finally {
      setAgingId(null);
    }
  }

  if (!requests.length) {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm p-10 text-center text-sm text-slate-500">
        No tickets to show.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full divide-y divide-slate-100">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 min-w-[320px]">Ticket</th>
            <th className="px-4 py-3 whitespace-nowrap">Category</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">SLA</th>
            {mode === "admin" && <th className="px-4 py-3">Assigned</th>}
            {mode === "admin" && <th className="px-4 py-3 min-w-[260px]">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {requests.map((r) => (
            <tr
              key={r.id}
              className={`${rowClass(r)} cursor-pointer transition ${selectedId === r.id ? "ring-2 ring-inset ring-slate-900" : ""}`}
              onClick={() => onSelect?.(r.id)}
            >
              <td className="px-4 py-3 text-sm align-middle min-w-[320px]">
                <div className="font-medium text-slate-900">
                  {r.is_breached && LIFE_CRITICAL.includes(r.category) && "🚨 "}
                  {r.title}
                </div>
                <div className="text-xs text-slate-500">
                  #{r.id} · {r.employee_name}
                  {mode === "employee" ? "" : ` → ${r.assigned_to_name ?? "unassigned"}`}
                </div>
              </td>
              <td className="px-4 py-3 text-sm align-middle whitespace-nowrap">{r.category}</td>
              <td className="px-4 py-3 text-sm align-middle whitespace-nowrap">{r.priority}</td>
              <td className="px-4 py-3 text-sm align-middle">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-3 text-sm align-middle">
                <SlaCountdown
                  minutesRemaining={r.minutes_remaining}
                  isBreached={r.is_breached}
                  fetchedAt={fetchedAt}
                />
              </td>
              {mode === "admin" && (
                <td className="px-4 py-3 text-sm align-middle" onClick={(e) => e.stopPropagation()}>
                  <select
                    className={selectClass}
                    value={r.assigned_to ?? ""}
                    onChange={(e) => onAssign?.(r.id, e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Unassigned</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </td>
              )}
              {mode === "admin" && (
                <td className="px-4 py-3 text-sm align-middle min-w-[260px]" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 flex-nowrap">
                    <select
                      className={selectClass}
                      value={r.status}
                      onChange={(e) => onStatusChange?.(r.id, e.target.value)}
                    >
                      {[...STATUSES, "Closed"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      className={ageBtnClass}
                      disabled={agingId === r.id}
                      onClick={() => handleAge(r.id)}
                      title="Backdate this ticket 6 minutes to demo SLA escalation"
                    >
                      {agingId === r.id ? "…" : "⏩ Simulate SLA breach"}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
