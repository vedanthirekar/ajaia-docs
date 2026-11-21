export default function LoadingDashboard() {
  return (
    <div className="flex-1" aria-busy="true" aria-label="Loading">
      <div className="h-14 border-b bg-background" />
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
