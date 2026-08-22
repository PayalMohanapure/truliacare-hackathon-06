import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { updateStatus, assignRequest, ageRequest } from "../../api/client";
import { STATUSES, CATEGORIES } from "../../constants";
import TicketTable from "../../components/TicketTable";
import EmptyState from "../../components/EmptyState";

const selectClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm " +
  "focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none bg-white";

const TABS = ["All Active", "Critical", "Medium", "Low"];

export default function OpsQueue() {
  const { requests = [], employees = [], refreshShell } = useOutletContext();
  const navigate = useNavigate();
  const [tab, setTab] = useState("All Active");
  const [filters, setFilters] = useState({ status: "", category: "" });
  const fetchedAt = Date.now();

  async function withRefresh(fn) {
    await fn();
    refreshShell?.();
  }

  const visible = requests
    .filter((r) => (tab === "All Active" ? !["Resolved", "Closed"].includes(r.status) : r.priority === tab))
    .filter((r) => !filters.status || r.status === filters.status)
    .filter((r) => !filters.category || r.category === filters.category);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Operational Queue</h1>
        <p className="text-sm text-slate-500">All maintenance requests across the hospital.</p>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select className={selectClass} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {[...STATUSES, "Closed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={selectClass} value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No tickets in this view." />
      ) : (
        <TicketTable
          requests={visible}
          employees={employees}
          mode="admin"
          fetchedAt={fetchedAt}
          onSelect={(id) => navigate(`/ops/queue/${id}`)}
          onStatusChange={(id, status) => withRefresh(() => updateStatus(id, status))}
          onAssign={(id, assignedTo) => withRefresh(() => assignRequest(id, assignedTo))}
          onAge={(id, minutes) => withRefresh(() => ageRequest(id, minutes))}
        />
      )}
    </div>
  );
}
