export default function LoadingDocument() {
  return (
    <div className="flex-1" aria-busy="true" aria-label="Loading document">
      <div className="h-14 border-b bg-background" />
      <div className="mx-auto mt-6 w-full max-w-[880px] px-4">
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
        <div className="mt-3 min-h-[60vh] space-y-3 rounded-sm border bg-background px-6 py-10 sm:px-16">
          <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
