export default function EmptyState({ title = "Nothing to show", message, action }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-12 text-center">
      <div className="text-3xl mb-2">🗂️</div>
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      {message && <p className="text-xs text-slate-400 mt-1">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
