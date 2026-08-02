import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6" role="status" aria-live="polite">
      <span className="sr-only">Carregando página</span>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-11 w-full rounded-lg sm:w-32" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
