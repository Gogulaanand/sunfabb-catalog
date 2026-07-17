export default function CatalogGridSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-(--spacing-gutter-desktop)">
      {/* Filter sidebar skeleton */}
      <div className="w-full lg:w-56 shrink-0 space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-4 w-24 rounded bg-surface-container-high animate-pulse mb-3" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-3 w-full rounded bg-surface-container animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Product grid skeleton */}
      <div className="flex-1 min-w-0">
        <div className="h-4 w-32 rounded bg-surface-container animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-(--spacing-gutter-desktop)">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-square rounded-md bg-surface-container animate-pulse mb-3" />
              <div className="h-4 w-3/4 rounded bg-surface-container-high animate-pulse mb-2" />
              <div className="h-3 w-1/3 rounded bg-surface-container animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
