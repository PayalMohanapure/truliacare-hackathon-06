import { useCallback, useEffect, useState } from "react";
import { listRequests } from "../api/client";
import NewRequestForm from "../components/NewRequestForm";
import TicketTable from "../components/TicketTable";

export default function EmployeeDashboard({ currentUser }) {
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState(Date.now());

  const refresh = useCallback(async () => {
    if (!currentUser?.id) return;
    const data = await listRequests({ employee_id: currentUser.id });
    setMyRequests(data);
    setFetchedAt(Date.now());
    setLoading(false);
  }, [currentUser?.id]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Requests</h1>
        <p className="text-sm text-slate-500">
          Signed in as {currentUser?.name ?? "…"} · {currentUser?.department}
        </p>
      </div>

      <NewRequestForm onCreated={refresh} />

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-10 text-center text-sm text-slate-400">
          Loading tickets…
        </div>
      ) : (
        <TicketTable requests={myRequests} mode="employee" fetchedAt={fetchedAt} />
      )}
    </div>
  );
}
