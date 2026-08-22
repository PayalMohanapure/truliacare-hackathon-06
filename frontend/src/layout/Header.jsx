import { Link, useLocation } from "react-router-dom";
import UserSwitcher from "./UserSwitcher";

const navClass = (active) =>
  `text-sm font-medium px-3 py-1.5 rounded-lg transition ${
    active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
  }`;

export default function Header({ currentUser, employees, onUserChange }) {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-6">
        <span className="text-lg font-bold tracking-tight text-slate-900">
          <span className="text-red-600">●</span> SENTINEL
        </span>
        <nav className="flex items-center gap-1">
          <Link to="/" className={navClass(pathname === "/")}>My Requests</Link>
          <Link to="/admin" className={navClass(pathname === "/admin")}>Admin Queue</Link>
          <Link to="/agent" className={navClass(pathname === "/agent")}>
            🤖 AI Agent
          </Link>
        </nav>
      </div>
      {employees.length > 0 && (
        <UserSwitcher employees={employees} value={currentUser?.id} onChange={onUserChange} />
      )}
    </header>
  );
}
