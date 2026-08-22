import { useEffect, useState } from "react";

export default function SlaBigCountdown({ minutesRemaining, isBreached, fetchedAt }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = Math.floor((Date.now() - fetchedAt) / 1000);
  const secs = Math.round(minutesRemaining * 60) - elapsed;
  const over = secs < 0 || isBreached;
  const a = Math.abs(secs);
  const label = `${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;

  return (
    <div
      className={`rounded-xl border p-5 text-center ${
        over
          ? "bg-red-50 border-red-300 animate-breach-pulse"
          : secs < 120
          ? "bg-orange-50 border-orange-200"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <div className={`text-xs font-bold uppercase tracking-wider ${over ? "text-red-700" : "text-slate-500"}`}>
        {over ? "SLA Breached" : "SLA Remaining"}
      </div>
      <div className={`text-4xl font-mono font-bold tabular-nums mt-2 ${over ? "text-red-700" : "text-slate-900"}`}>
        {over ? "-" : ""}{label}
      </div>
      {over && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-700">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-siren" />
          Escalation triggered
        </div>
      )}
    </div>
  );
}
