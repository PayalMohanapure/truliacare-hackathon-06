import { useNavigate, useOutletContext } from "react-router-dom";
import EmptyState from "../../components/EmptyState";

export default function Technicians() {
  const { requests = [], employees = [] } = useOutletContext();
  const navigate = useNavigate();
  const technicians = employees.filter((e) => e.role === "technician" || e.role === "admin");
  const today = new Date().toDateString();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Technicians</h1>
        <p className="text-sm text-slate-500">Team load and availability across biomedical, electrical, and facilities.</p>
      </div>

      {technicians.length === 0 ? <EmptyState title="No technicians found." /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full divide-y divide-slate-100">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Availability</th>
                <th className="px-4 py-3">Active Tickets</th>
                <th className="px-4 py-3">Resolved Today</th>
                <th className="px-4 py-3">Current Load</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {technicians.map((t) => {
                const active = requests.filter((r) => r.assigned_to === t.id && !["Resolved", "Closed"].includes(r.status));
                const resolvedToday = requests.filter((r) => r.assigned_to === t.id && r.status === "Resolved" && new Date(`${r.updated_at}Z`).toDateString() === today);
                const busy = active.length >= 2;
                const loadPct = Math.min(100, active.length * 34);
                return (
                  <tr key={t.id}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">{t.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{t.department}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${busy ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {busy ? "BUSY" : "AVAILABLE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{active.length} active</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{resolvedToday.length} resolved</td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${busy ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${loadPct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate("/ops/dispatch")}
                        className="text-xs font-semibold text-slate-900 hover:underline whitespace-nowrap"
                      >
                        Assign Ticket →
                      </button>
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
