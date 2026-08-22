import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import UserSwitcher from "./UserSwitcher";
import NotificationsDrawer from "./NotificationsDrawer";
import { buildNotifications } from "../lib/notifications";

export default function Topbar({
  portal, currentUser, employees, onUserChange, onMenuClick, requests = [], escalations = [],
}) {
  const [query, setQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  const detailBase = portal === "employee" ? "/employee/requests" : "/ops/queue";
  const roleFilter = portal === "employee" ? "employee" : null;
  const scopedEmployees = roleFilter
    ? employees.filter((e) => e.role === roleFilter)
    : employees.filter((e) => e.role !== "employee");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return requests
      .filter((r) =>
        String(r.id).includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, requests]);

  const notifications = useMemo(
    () => buildNotifications(requests, escalations, currentUser),
    [requests, escalations, currentUser]
  );

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center gap-3 shadow-sm">
      <button
        onClick={onMenuClick}
        className="lg:hidden shrink-0 h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600"
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      {portal === "ops" && (
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 px-2.5 py-1 text-xs font-semibold shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> System Operational
        </span>
      )}

      <div className="relative flex-1 max-w-md">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ticket ID, asset, location…"
          className="w-full rounded-lg border border-slate-300 pl-3 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
        />
        {results.length > 0 && (
          <div className="absolute mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden z-30">
            {results.map((r) => (
              <Link
                key={r.id}
                to={`${detailBase}/${r.id}`}
                onClick={() => setQuery("")}
                className="block px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0"
              >
                <span className="font-semibold text-slate-900">#{r.id}</span>{" "}
                <span className="text-slate-600">{r.title}</span>
                <span className="block text-slate-400">{r.category} · {r.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setNotifOpen(true)}
        className="relative shrink-0 h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
        aria-label="Notifications"
      >
        🔔
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {scopedEmployees.length > 0 && (
        <UserSwitcher employees={scopedEmployees} value={currentUser?.id} onChange={onUserChange} />
      )}

      <NotificationsDrawer open={notifOpen} onClose={() => setNotifOpen(false)} items={notifications} />
    </header>
  );
}
