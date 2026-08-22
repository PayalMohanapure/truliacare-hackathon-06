import { useEffect, useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { listRequests, listEscalations } from "../api/client";
import CardSkeleton from "../components/CardSkeleton";
import TableSkeleton from "../components/TableSkeleton";
import ErrorState from "../components/ErrorState";

export default function EmployeeLayout({ currentUser, employees, onUserChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [status, setStatus] = useState("loading");

  const refresh = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [reqs, escs] = await Promise.all([
        listRequests({ employee_id: currentUser.id }),
        listEscalations({}),
      ]);
      setRequests(reqs);
      setEscalations(escs);
      setStatus("ready");
    } catch {
      setStatus((s) => (s === "ready" ? s : "error"));
    }
  }, [currentUser?.id]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased lg:flex">
      <Sidebar portal="employee" currentUser={currentUser} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0">
        <Topbar
          portal="employee"
          currentUser={currentUser}
          employees={employees}
          onUserChange={onUserChange}
          onMenuClick={() => setSidebarOpen((v) => !v)}
          requests={requests}
          escalations={escalations}
        />
        <main>
          {status === "loading" ? (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
              <CardSkeleton />
              <TableSkeleton />
            </div>
          ) : status === "error" ? (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
              <ErrorState message="Unable to load your maintenance requests." onRetry={refresh} />
            </div>
          ) : (
            <Outlet context={{ currentUser, employees, requests, escalations, refreshShell: refresh }} />
          )}
        </main>
      </div>
    </div>
  );
}
