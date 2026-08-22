export default function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-pulse">
          <div className="h-7 w-14 rounded bg-slate-200" />
          <div className="h-2.5 w-20 rounded bg-slate-100 mt-3" />
        </div>
      ))}
    </div>
  );
}
