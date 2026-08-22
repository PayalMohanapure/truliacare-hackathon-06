import { useEffect, useState } from "react";
import { listEscalations } from "../api/client";

function relativeTime(iso) {
  // Backend sends naive UTC timestamps (no offset). Force UTC parsing —
  // treating them as local time silently shifts this by the browser's UTC offset.
  const hasOffset = /[Zz]|[+-]\d{2}:?\d{2}$/.test(iso);
  const then = new Date(hasOffset ? iso : `${iso}Z`).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

export default function EscalationTimeline({ requestId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listEscalations(requestId ? { request_id: requestId } : {})
      .then((data) => { if (!cancelled) setLogs(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [requestId]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-slate-900 mb-4">
        {requestId ? `Escalation timeline — #${requestId}` : "Escalation timeline — all tickets"}
      </h2>
      {loading && <p className="text-xs text-slate-400">Loading…</p>}
      {!loading && logs.length === 0 && (
        <p className="text-xs text-slate-400">No escalations yet.</p>
      )}
      <div>
        {logs.map((log) => (
          <div key={log.id} className="relative pl-6 pb-4 border-l-2 border-red-200 last:border-transparent">
            <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-red-500 ring-4 ring-red-100" />
            <div className="text-xs font-semibold text-slate-900">
              {log.request_title} <span className="text-slate-400 font-normal">#{log.request_id}</span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">{log.reason}</div>
            {log.escalated_to && (
              <div className="text-xs text-red-700 font-medium mt-0.5">→ {log.escalated_to}</div>
            )}
            <div className="text-[11px] text-slate-400 mt-0.5">{relativeTime(log.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
