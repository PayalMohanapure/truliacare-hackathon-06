import { useOutletContext, useNavigate } from "react-router-dom";
import { updateStatus } from "../../api/client";
import KpiCard from "../../components/KpiCard";
import TicketCard from "../../components/TicketCard";
import EmptyState from "../../components/EmptyState";

export default function OpsOverview() {
  const { requests = [], refreshShell } = useOutletContext();
  const navigate = useNavigate();
  const fetchedAt = Date.now();

  const openTotal = requests.filter((r) => !["Resolved", "Closed"].includes(r.status)).length;
  const critical = requests.filter((r) => r.priority === "Critical" && !["Resolved", "Closed"].includes(r.status)).length;
  const pending = requests.filter((r) => r.status === "Pending").length;
  const inProgress = requests.filter((r) => r.status === "In Progress").length;
  const today = new Date().toDateString();
  const dispatchedToday = requests.filter((r) => r.assigned_to && new Date(`${r.updated_at}Z`).toDateString() === today).length;

  const criticalActive = requests
    .filter((r) => !["Resolved", "Closed"].includes(r.status) && (r.is_breached || r.priority === "Critical"))
    .slice(0, 4);

  async function handleEscalate(r) {
    await updateStatus(r.id, "Escalated");
    refreshShell?.();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Maintenance Operations</h1>
        <p className="text-sm text-slate-500">Real-time hospital maintenance command center.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Open Tickets" value={openTotal} />
        <KpiCard label="Critical Priority" value={critical} accent="text-red-700" />
        <KpiCard label="Pending Review" value={pending} accent="text-amber-700" />
        <KpiCard label="In Progress" value={inProgress} accent="text-blue-700" />
        <KpiCard label="Dispatched Today" value={dispatchedToday} accent="text-emerald-700" />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Critical Active</h2>
        {criticalActive.length === 0 ? (
          <EmptyState title="No critical tickets right now." message="All life-critical categories are within SLA." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {criticalActive.map((r) => (
              <TicketCard
                key={r.id}
                r={r}
                fetchedAt={fetchedAt}
                footer={
                  <div className="flex items-center gap-2">
                    {r.is_breached ? (
                      <button
                        onClick={() => handleEscalate(r)}
                        className="flex-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
                      >
                        Escalate Immediately
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/ops/queue/${r.id}`)}
                        className="flex-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
                      >
                        Dispatch Now
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/ops/queue/${r.id}`)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                    >
                      More →
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
