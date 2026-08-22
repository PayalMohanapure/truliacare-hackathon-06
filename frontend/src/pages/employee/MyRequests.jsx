import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { STATUSES, CATEGORIES, PRIORITIES } from "../../constants";
import TicketTable from "../../components/TicketTable";
import EmptyState from "../../components/EmptyState";

const selectClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm " +
  "focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none bg-white";

export default function MyRequests() {
  const { currentUser, requests = [] } = useOutletContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "", category: "", priority: "" });
  const fetchedAt = Date.now();

  const visible = requests
    .filter((r) => !filters.status || r.status === filters.status)
    .filter((r) => !filters.category || r.category === filters.category)
    .filter((r) => !filters.priority || r.priority === filters.priority)
    .filter((r) => !search.trim() || r.title.toLowerCase().includes(search.trim().toLowerCase()) || String(r.id).includes(search.trim()));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Maintenance Requests</h1>
        <p className="text-sm text-slate-500">Signed in as {currentUser?.name ?? "…"} · {currentUser?.department}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or ticket ID"
          className={`${selectClass} min-w-[220px] flex-1 max-w-xs`}
        />
        <select className={selectClass} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {[...STATUSES, "Closed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={selectClass} value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select className={selectClass} value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No maintenance requests found." />
      ) : (
        <TicketTable requests={visible} mode="employee" fetchedAt={fetchedAt}
          onSelect={(id) => navigate(`/employee/requests/${id}`)} />
      )}
    </div>
  );
}
