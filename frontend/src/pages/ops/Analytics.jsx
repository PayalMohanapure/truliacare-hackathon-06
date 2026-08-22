import { useOutletContext } from "react-router-dom";
import KpiCard from "../../components/KpiCard";

export default function Analytics() {
  const { requests = [] } = useOutletContext();

  const total = requests.length;
  const open = requests.filter((r) => !["Resolved", "Closed"].includes(r.status)).length;
  const resolved = requests.filter((r) => r.status === "Resolved").length;
  const escalated = requests.filter((r) => r.status === "Escalated").length;
  const critical = requests.filter((r) => r.priority === "Critical").length;

  const resolvedTickets = requests.filter((r) => r.status === "Resolved");
  const avgResolutionMin = resolvedTickets.length
    ? Math.round(
        resolvedTickets.reduce((sum, r) => {
          const created = new Date(`${r.created_at}Z`).getTime();
          const updated = new Date(`${r.updated_at}Z`).getTime();
          return sum + (updated - created) / 60000;
        }, 0) / resolvedTickets.length
      )
    : 0;

  const breachRate = total ? Math.round((escalated / total) * 1000) / 10 : 0;
  const resolutionRate = total ? Math.round((resolved / total) * 1000) / 10 : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">Operational summary across all maintenance requests.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Requests" value={total} />
        <KpiCard label="Open Requests" value={open} />
        <KpiCard label="Resolved Requests" value={resolved} accent="text-emerald-700" />
        <KpiCard label="Escalated Requests" value={escalated} accent="text-red-700" />
        <KpiCard label="Critical Requests" value={critical} accent="text-orange-700" />
        <KpiCard label="Avg Resolution Time" value={`${avgResolutionMin}m`} />
        <KpiCard label="SLA Breach Rate" value={`${breachRate}%`} accent={breachRate > 15 ? "text-red-700" : "text-slate-900"} />
        <KpiCard label="Resolution Rate" value={`${resolutionRate}%`} accent="text-emerald-700" />
      </div>
    </div>
  );
}
