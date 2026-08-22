export default function ConfirmModal({
  open, title, message, confirmLabel = "Confirm", tone = "danger", onConfirm, onCancel,
}) {
  if (!open) return null;

  const confirmClass = tone === "danger"
    ? "bg-red-600 hover:bg-red-700"
    : "bg-slate-900 hover:bg-slate-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {message && <p className="text-sm text-slate-600 mt-2">{message}</p>}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
