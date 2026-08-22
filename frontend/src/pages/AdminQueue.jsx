import { useCallback, useEffect, useState } from "react";
import { listRequests, getStats, updateStatus, assignRequest, ageRequest } from "../api/client";
import { STATUSES, CATEGORIES } from "../constants";
import StatCards from "../components/StatCards";
import TicketTable from "../components/TicketTable";
import EscalationTimeline from "../components/EscalationTimeline";

const selectClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm " +
  "focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none bg-white";

export default function AdminQueue({ employees }) {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ status: "", category: "" });
  const [selectedId, setSelectedId] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [reqData, statsData] = await Promise.all([listRequests(filters), getStats()]);
    setRequests(reqData);
    setStats(statsData);
    setFetchedAt(Date.now());
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [refresh]);

  async function handleStatusChange(id, status) {
    await updateStatus(id, status);
    refresh();
  }

  async function handleAssign(id, assignedTo) {
    await assignRequest(id, assignedTo);
    refresh();
  }

  async function handleAge(id, minutes) {
    await ageRequest(id, minutes);
    refresh();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Admin Queue</h1>
        <p className="text-sm text-slate-500">All maintenance requests across the hospital.</p>
      </div>

      <StatCards stats={stats} />

      <div className="flex flex-wrap items-center gap-3">
        <select
          className={selectClass}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All statuses</option>
          {[...STATUSES, "Closed"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className={selectClass}
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-10 text-center text-sm text-slate-400">
              Loading tickets…
            </div>
          ) : (
            <TicketTable
              requests={requests}
              employees={employees}
              mode="admin"
              fetchedAt={fetchedAt}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
              onStatusChange={handleStatusChange}
              onAssign={handleAssign}
              onAge={handleAge}
            />
          )}
        </div>
        <div>
          <EscalationTimeline requestId={selectedId} />
        </div>
      </div>
    </div>
  );
}
