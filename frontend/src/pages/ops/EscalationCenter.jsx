import { useNavigate, useOutletContext } from "react-router-dom";
import KpiCard from "../../components/KpiCard";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import { LIFE_CRITICAL } from "../../constants";

function relativeClock(iso) {
  const hasOffset = /[Zz]|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(hasOffset ? iso : `${iso}Z`).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function EscalationCenter() {
  const { requests = [], escalations = [] } = useOutletContext();
  const navigate = useNavigate();
  const today = new Date().toDateString();

  const escalatedTickets = requests.filter((r) => r.status === "Escalated");
  const criticalBreaches = escalatedTickets.filter((r) => LIFE_CRITICAL.includes(r.category));
  const resolvedToday = requests.filter((r) => r.status === "Resolved" && new Date(`${r.updated_at}Z`).toDateString() === today);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Escalation Center</h1>
        <p className="text-sm text-slate-500">Breached and manually escalated tickets, and where they were routed.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Escalations" value={escalatedTickets.length} accent="text-red-700" />
        <KpiCard label="Critical Breaches" value={criticalBreaches.length} accent="text-red-700" />
        <KpiCard label="Unacknowledged" value={escalatedTickets.filter((r) => !r.assigned_to).length} accent="text-amber-700" />
        <KpiCard label="Resolved Today" value={resolvedToday.length} accent="text-emerald-700" />
      </div>

      {escalations.length === 0 ? <EmptyState title="No escalations yet." message="Tickets appear here the moment they breach SLA or are manually escalated." /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full divide-y divide-slate-100">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Escalated To</th>
                <th className="px-4 py-3 min-w-[240px]">Reason</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {escalations.map((e) => {
                const current = requests.find((r) => r.id === e.request_id);
                return (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/ops/queue/${e.request_id}`)}
                    className="cursor-pointer hover:bg-slate-50 transition border-l-4 border-red-400"
                  >
                    <td className="px-4 py-3 text-sm align-top">
                      <div className="font-medium text-slate-900">{e.request_title}</div>
                      <div className="text-xs text-slate-400">#{e.request_id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm align-top whitespace-nowrap">{e.category}</td>
                    <td className="px-4 py-3 text-sm align-top text-red-700 font-medium whitespace-nowrap">{e.escalated_to ?? "—"}</td>
                    <td className="px-4 py-3 text-xs align-top text-slate-600">{e.reason}</td>
                    <td className="px-4 py-3 text-xs align-top text-slate-400 whitespace-nowrap">{relativeClock(e.created_at)}</td>
                    <td className="px-4 py-3 align-top">
                      <StatusBadge status={current?.status ?? "Escalated"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
