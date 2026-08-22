import { useNavigate } from "react-router-dom";

export default function Welcome({ onSelectPortal }) {
  const navigate = useNavigate();

  function enter(portal) {
    onSelectPortal(portal);
    navigate(portal === "employee" ? "/employee" : "/ops");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-950">
      <div className="relative flex flex-col justify-center px-8 sm:px-16 py-16 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
             style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="relative">
          <div className="text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="text-red-500">●</span> SENTINEL
          </div>
          <p className="mt-3 text-lg text-slate-300">Smart Maintenance Operations</p>
          <p className="mt-6 text-2xl font-semibold text-white max-w-md">
            Report. Prioritize. Dispatch. Resolve.
          </p>
          <p className="mt-6 text-sm text-slate-400 max-w-md leading-relaxed">
            SENTINEL keeps hospital critical-asset maintenance on a live SLA clock —
            from a ventilator alarm on ICU Bay 4 to a vaccine fridge drifting out of
            range — so nothing life-critical waits in a queue unnoticed.
          </p>
        </div>
      </div>

      <div className="bg-slate-50 flex flex-col justify-center px-8 sm:px-16 py-16">
        <h1 className="text-2xl font-bold text-slate-900">Select Your Role</h1>
        <p className="text-sm text-slate-500 mt-1 mb-8">Choose the experience for your work today.</p>

        <div className="space-y-4">
          <button
            onClick={() => enter("employee")}
            className="w-full text-left rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-900 hover:shadow-md transition group"
          >
            <div className="text-2xl">🏥</div>
            <h2 className="mt-3 text-lg font-bold text-slate-900">Employee Portal</h2>
            <p className="text-sm text-slate-500 mt-1">For raising and tracking maintenance requests.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-900 group-hover:gap-2 transition-all">
              Access Employee Portal →
            </span>
          </button>

          <button
            onClick={() => enter("ops")}
            className="w-full text-left rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-900 hover:shadow-md transition group"
          >
            <div className="text-2xl">🛰️</div>
            <h2 className="mt-3 text-lg font-bold text-slate-900">Operations Command Center</h2>
            <p className="text-sm text-slate-500 mt-1">For managing, dispatching, and escalating maintenance issues.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-900 group-hover:gap-2 transition-all">
              Enter Command Center →
            </span>
          </button>
        </div>

        <p className="mt-10 text-[11px] font-semibold tracking-widest text-slate-400 text-center">
          AUTHORIZED PERSONNEL ONLY
        </p>
      </div>
    </div>
  );
}
