import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PriorityBadge from "../../components/PriorityBadge";
import StatusBadge from "../../components/StatusBadge";

export default function RequestSuccess() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const ticket = state?.ticket;

  useEffect(() => {
    if (!ticket) navigate("/employee", { replace: true });
  }, [ticket, navigate]);

  if (!ticket) return null;

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-16 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">✅</div>
      <h1 className="mt-5 text-xl font-bold text-slate-900">Maintenance Request Submitted</h1>
      <p className="text-sm text-slate-500 mt-2">Your request has been added to the operations queue.</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm p-6 text-left space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Ticket ID</span>
          <span className="text-sm font-bold text-slate-900">REQ-{String(ticket.id).padStart(4, "0")}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Status</span>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Priority</span>
          <PriorityBadge priority={ticket.priority} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Estimated SLA</span>
          <span className="text-sm font-semibold text-slate-900">{ticket.sla_minutes} minutes</span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={() => navigate(`/employee/requests/${ticket.id}`)}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition"
        >
          View Request
        </button>
        <button
          onClick={() => navigate("/employee")}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
