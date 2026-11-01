export function EditorSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Memuat editor">
      <div className="flex items-center justify-between gap-2">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-11 w-28" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="card space-y-3">
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-11 w-full" />
            <div className="skeleton h-16 w-full" />
          </div>
          <div className="card">
            <div className="skeleton h-80 w-full" />
          </div>
        </div>
        <div className="card space-y-3">
          <div className="skeleton h-5 w-24" />
          <div className="skeleton h-11 w-full" />
          <div className="skeleton h-11 w-full" />
          <div className="skeleton h-11 w-full" />
        </div>
      </div>
    </div>
  );
}
