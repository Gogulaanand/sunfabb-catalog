export default function ProductDetailLoading() {
  return (
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-16">
      {/* Breadcrumb */}
      <div className="h-4 w-48 rounded bg-surface-container animate-pulse mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Gallery skeleton */}
        <div>
          <div className="aspect-square rounded-md bg-surface-container animate-pulse mb-3" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-16 h-16 rounded bg-surface-container animate-pulse"
              />
            ))}
          </div>
        </div>

        {/* Product info skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-24 rounded bg-surface-container animate-pulse" />
          <div className="h-8 w-3/4 rounded bg-surface-container-high animate-pulse" />
          <div className="h-6 w-24 rounded bg-surface-container animate-pulse" />
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full rounded bg-surface-container animate-pulse" />
            <div className="h-3 w-5/6 rounded bg-surface-container animate-pulse" />
            <div className="h-3 w-4/5 rounded bg-surface-container animate-pulse" />
          </div>
          <div className="pt-4 space-y-3">
            <div className="h-4 w-20 rounded bg-surface-container-high animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-9 w-20 rounded bg-surface-container animate-pulse"
                />
              ))}
            </div>
          </div>
          <div className="h-12 w-full rounded-full bg-surface-container animate-pulse mt-6" />
        </div>
      </div>
    </div>
  );
}
