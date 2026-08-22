import { useNavigate, useOutletContext } from "react-router-dom";
import EmptyState from "../../components/EmptyState";
import TicketTable from "../../components/TicketTable";
import KpiCard from "../../components/KpiCard";

export default function EmployeeOverview() {
  const { currentUser, requests = [] } = useOutletContext();
  const navigate = useNavigate();
  const fetchedAt = Date.now();

  const openCount = requests.filter((r) => r.status === "Pending").length;
  const inProgress = requests.filter((r) => r.status === "In Progress").length;
  const resolved = requests.filter((r) => r.status === "Resolved").length;
  const escalated = requests.filter((r) => r.status === "Escalated").length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{greeting}, {currentUser?.name?.split(" ")[0] ?? "…"} 👋</h1>
        <p className="text-sm text-slate-500">Track your maintenance requests and report new issues quickly.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Open Requests" value={openCount} />
        <KpiCard label="In Progress" value={inProgress} accent="text-blue-700" />
        <KpiCard label="Resolved" value={resolved} accent="text-emerald-700" />
        <KpiCard label="Escalated" value={escalated} accent="text-red-700" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Report an Issue</h2>
          <p className="text-xs text-slate-500 mt-1">Something not working? Get it in front of the right team in seconds.</p>
        </div>
        <button
          onClick={() => navigate("/employee/new")}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition"
        >
          Raise Maintenance Request →
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Recent Requests</h2>
          <button onClick={() => navigate("/employee/requests")} className="text-xs font-semibold text-slate-600 hover:text-slate-900">
            View All →
          </button>
        </div>

        {requests.length === 0 ? (
          <EmptyState title="No maintenance requests found." action={
            <button onClick={() => navigate("/employee/new")} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Raise Maintenance Request
            </button>
          } />
        ) : (
          <TicketTable requests={requests.slice(0, 5)} mode="employee" fetchedAt={fetchedAt}
            onSelect={(id) => navigate(`/employee/requests/${id}`)} />
        )}
      </div>
    </div>
  );
}
