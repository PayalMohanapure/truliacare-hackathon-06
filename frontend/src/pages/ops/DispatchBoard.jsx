import { useOutletContext } from "react-router-dom";
import { updateStatus } from "../../api/client";
import TicketCard from "../../components/TicketCard";
import EmptyState from "../../components/EmptyState";

const COLUMNS = [
  { key: "Unassigned",  match: (r) => !r.assigned_to && r.status === "Pending" },
  { key: "Pending",     match: (r) => !!r.assigned_to && r.status === "Pending" },
  { key: "In Progress", match: (r) => r.status === "In Progress" },
  { key: "Resolved",    match: (r) => r.status === "Resolved" },
  { key: "Escalated",   match: (r) => r.status === "Escalated" },
];

const NEXT_STATUS = {
  Unassigned: null,
  Pending: "In Progress",
  "In Progress": "Resolved",
  Resolved: null,
  Escalated: "In Progress",
};

export default function DispatchBoard() {
  const { requests = [], employees = [], refreshShell } = useOutletContext();
  const fetchedAt = Date.now();
  const technicians = employees.filter((e) => e.role === "technician" || e.role === "admin");

  async function advance(r, colKey) {
    const next = NEXT_STATUS[colKey];
    if (!next) return;
    await updateStatus(r.id, next);
    refreshShell?.();
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dispatch Board</h1>
        <p className="text-sm text-slate-500">Move tickets through the workflow and see who's available.</p>
      </div>

      <div className="grid xl:grid-cols-[1fr_300px] gap-6">
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-[1100px] xl:min-w-0 xl:grid xl:grid-cols-5">
            {COLUMNS.map((col) => {
              const items = requests.filter(col.match);
              return (
                <div key={col.key} className="w-64 xl:w-auto shrink-0 flex flex-col">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">{col.key}</h2>
                    <span className="text-xs font-semibold text-slate-400">{items.length}</span>
                  </div>
                  <div className="flex-1 space-y-3 min-h-[80px]">
                    {items.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-[11px] text-slate-400">Empty</div>
                    ) : items.map((r) => (
                      <TicketCard
                        key={r.id}
                        r={r}
                        fetchedAt={fetchedAt}
                        footer={NEXT_STATUS[col.key] && (
                          <button
                            onClick={() => advance(r, col.key)}
                            className="w-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
                          >
                            Move to {NEXT_STATUS[col.key]} →
                          </button>
                        )}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Technician Availability</h2>
          {technicians.length === 0 ? <EmptyState title="No technicians found." /> : (
            <div className="space-y-3">
              {technicians.map((t) => {
                const active = requests.filter((r) => r.assigned_to === t.id && !["Resolved", "Closed"].includes(r.status));
                const busy = active.length >= 2;
                return (
                  <div key={t.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">{t.name}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${busy ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {busy ? "BUSY" : "AVAILABLE"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{t.department}</div>
                    <div className="text-xs text-slate-400 mt-1">{active.length} active ticket{active.length === 1 ? "" : "s"}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
