const TONE_STYLE = {
  critical: "border-red-200 bg-red-50",
  warning:  "border-orange-200 bg-orange-50",
  info:     "border-blue-200 bg-blue-50",
  resolved: "border-emerald-200 bg-emerald-50",
};

export default function NotificationsDrawer({ open, onClose, items }) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-screen w-full max-w-sm bg-white shadow-xl border-l border-slate-200 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">Notifications</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-10">No notifications right now.</p>
          )}
          {items.map((n) => (
            <div key={n.id} className={`rounded-lg border px-3 py-2.5 text-xs ${TONE_STYLE[n.tone]}`}>
              <span className="mr-1.5">{n.icon}</span>
              <span className="text-slate-800">{n.text}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
