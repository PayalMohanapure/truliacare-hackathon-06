import { useEffect, useState } from "react";

export default function SlaCountdown({ minutesRemaining, isBreached, fetchedAt }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = Math.floor((Date.now() - fetchedAt) / 1000);
  const secs = Math.round(minutesRemaining * 60) - elapsed;
  const over = secs < 0;
  const a = Math.abs(secs);
  const label = `${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;

  const tone = over || isBreached
    ? "text-red-700 bg-red-100 animate-siren"
    : secs < 120 ? "text-orange-700 bg-orange-100"
    : secs < 600 ? "text-amber-700 bg-amber-50"
    : "text-slate-600 bg-slate-100";

  return (
    <span className={`font-mono text-xs font-bold px-2 py-1 rounded tabular-nums ${tone}`}>
      {over || isBreached ? `+${label} OVER` : `${label} left`}
    </span>
  );
}
