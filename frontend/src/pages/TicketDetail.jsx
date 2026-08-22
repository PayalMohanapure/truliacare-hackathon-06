import { useCallback, useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { getRequest, assignRequest, updateStatus, ageRequest } from "../api/client";
import { STATUSES } from "../constants";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import SlaBigCountdown from "../components/SlaBigCountdown";
import EscalationTimeline from "../components/EscalationTimeline";
import ConfirmModal from "../components/ConfirmModal";
import ErrorState from "../components/ErrorState";

const selectClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm " +
  "focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none bg-white";

function parseDescription(desc = "") {
  const [first, ...rest] = desc.split("\n\n");
  const location = first?.startsWith("Location:") ? first : null;
  return { meta: location, body: (location ? rest.join("\n\n") : desc).trim() };
}

export default function TicketDetail({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employees = [] } = useOutletContext() ?? {};
  const [ticket, setTicket] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(Date.now());
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await getRequest(id);
      setTicket(data);
      setFetchedAt(Date.now());
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [refresh]);

  if (error) return <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8"><ErrorState message="Unable to load this ticket." onRetry={refresh} /></div>;
  if (!ticket) return <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16 text-center text-sm text-slate-400">Loading ticket…</div>;

  const { meta, body } = parseDescription(ticket.description);
  const technicians = employees.filter((e) => e.role === "technician" || e.role === "admin");
  const backTo = mode === "ops" ? "/ops/queue" : "/employee/requests";

  async function doAssign(assignedTo) {
    setBusy(true);
    try { await assignRequest(ticket.id, assignedTo); await refresh(); } finally { setBusy(false); }
  }
  async function doStatus(status) {
    setBusy(true);
    try { await updateStatus(ticket.id, status); await refresh(); } finally { setBusy(false); setConfirm(null); }
  }
  async function doSimulateBreach() {
    setBusy(true);
    try { await ageRequest(ticket.id, 6); await refresh(); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <button onClick={() => navigate(backTo)} className="text-xs font-semibold text-slate-500 hover:text-slate-900">← Back</button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-400">REQ-{String(ticket.id).padStart(4, "0")}</div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">{ticket.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Details</h2>
            {meta && <p className="text-xs text-slate-500">{meta}</p>}
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{body || "No additional description provided."}</p>
            <dl className="grid grid-cols-2 gap-y-2 pt-2 text-sm border-t border-slate-100 mt-2">
              <dt className="text-slate-400">Category</dt><dd className="text-slate-800">{ticket.category}</dd>
              <dt className="text-slate-400">Reported by</dt><dd className="text-slate-800">{ticket.employee_name}</dd>
              <dt className="text-slate-400">Assigned to</dt><dd className="text-slate-800">{ticket.assigned_to_name ?? "Unassigned"}</dd>
              <dt className="text-slate-400">Created</dt><dd className="text-slate-800">{new Date(`${ticket.created_at}Z`).toLocaleString()}</dd>
              <dt className="text-slate-400">Last Updated</dt><dd className="text-slate-800">{new Date(`${ticket.updated_at}Z`).toLocaleString()}</dd>
            </dl>
          </section>

          {mode === "ops" && (
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Assignment &amp; Status</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Assigned technician</label>
                  <select className={selectClass} value={ticket.assigned_to ?? ""} disabled={busy}
                          onChange={(e) => doAssign(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Unassigned</option>
                    {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <select className={selectClass} value={ticket.status} disabled={busy}
                          onChange={(e) => e.target.value === "Escalated"
                            ? setConfirm({ type: "escalate" })
                            : doStatus(e.target.value)}>
                    {[...STATUSES, "Closed"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => doStatus("Resolved")} disabled={busy}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition">
                  Resolve
                </button>
                <button onClick={() => setConfirm({ type: "escalate" })} disabled={busy}
                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40 transition">
                  Escalate
                </button>
                <button onClick={doSimulateBreach} disabled={busy}
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-40 transition">
                  ⏩ Simulate SLA breach
                </button>
              </div>
            </section>
          )}

          <EscalationTimeline requestId={ticket.id} />
        </div>

        <div className="space-y-6">
          <SlaBigCountdown minutesRemaining={ticket.minutes_remaining} isBreached={ticket.is_breached} fetchedAt={fetchedAt} />
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 text-xs text-slate-500 space-y-1.5">
            <div className="flex justify-between"><span>SLA duration</span><span className="text-slate-800 font-medium">{ticket.sla_minutes} min</span></div>
            <div className="flex justify-between"><span>Time elapsed</span><span className="text-slate-800 font-medium">{ticket.age_minutes} min</span></div>
            <div className="flex justify-between"><span>Breach status</span><span className={ticket.is_breached ? "text-red-700 font-semibold" : "text-emerald-700 font-medium"}>{ticket.is_breached ? "Breached" : "Within SLA"}</span></div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!confirm}
        title="Escalate this ticket?"
        message="This will mark the ticket as Escalated and route it to the on-call owner for its category."
        confirmLabel="Escalate"
        onCancel={() => setConfirm(null)}
        onConfirm={() => doStatus("Escalated")}
      />
    </div>
  );
}
