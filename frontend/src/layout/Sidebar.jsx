import { Link, useLocation, useNavigate } from "react-router-dom";

const EMPLOYEE_NAV = [
  { to: "/employee",         label: "Overview",      icon: "🏠", end: true },
  { to: "/employee/requests",label: "My Requests",   icon: "🗒️" },
  { to: "/employee/new",     label: "Raise Request",  icon: "➕" },
  { to: "/employee/help",    label: "Help Center",    icon: "❓" },
];

const OPS_NAV = [
  { to: "/ops",              label: "Overview",       icon: "🛰️", end: true },
  { to: "/ops/queue",        label: "Ticket Queue",    icon: "📋" },
  { to: "/ops/dispatch",     label: "Dispatch Board",  icon: "🧭" },
  { to: "/ops/escalations",  label: "Escalations",     icon: "🚨" },
  { to: "/ops/technicians",  label: "Technicians",     icon: "🛠️" },
  { to: "/ops/analytics",    label: "Analytics",       icon: "📊" },
];

function isActive(pathname, item) {
  return item.end ? pathname === item.to : pathname.startsWith(item.to);
}

export default function Sidebar({ portal, currentUser, open, onClose }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const nav = portal === "employee" ? EMPLOYEE_NAV : OPS_NAV;
  const helpPath = portal === "employee" ? "/employee/help" : "/ops/help";

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed lg:sticky top-0 z-40 lg:z-0 h-screen w-64 shrink-0 bg-slate-950 text-slate-200
          flex flex-col transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="text-lg font-bold tracking-tight text-white">
            <span className="text-red-500">●</span> SENTINEL
          </div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 mt-0.5">
            {portal === "employee" ? "Employee Portal" : "Operations Command Center"}
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(pathname, item)
                  ? "bg-white text-slate-900"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800 space-y-1">
          <Link
            to={helpPath}
            onClick={onClose}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <span className="text-base leading-none">❓</span> Help Center
          </Link>
          <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
            <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
              {currentUser?.name?.[0] ?? "?"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{currentUser?.name ?? "…"}</div>
              <div className="text-[11px] text-slate-500 truncate">{currentUser?.department}</div>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <span className="text-base leading-none">⏻</span> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
