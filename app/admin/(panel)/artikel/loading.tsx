export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Memuat artikel">
      <div className="flex items-center justify-between gap-2">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-11 w-36" />
      </div>
      <div className="card space-y-2">
        <div className="skeleton h-11 w-full" />
      </div>
      <div className="card space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton h-5 flex-1" />
            <div className="skeleton h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
