export default function ErrorState({ message = "Unable to load data.", onRetry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 shadow-sm p-12 text-center">
      <div className="text-3xl mb-2">⚠️</div>
      <div className="text-sm font-semibold text-red-800">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
        >
          Retry
        </button>
      )}
    </div>
  );
}
