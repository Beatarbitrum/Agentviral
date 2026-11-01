// Kerangka instan saat berpindah menu admin — ketukan langsung terasa responsif.
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Memuat">
      <div className="flex items-center justify-between gap-2">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-11 w-32" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card space-y-3">
            <div className="skeleton h-5 w-1/3" />
            <div className="skeleton h-11 w-full" />
            <div className="skeleton h-11 w-full" />
            <div className="skeleton h-24 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
