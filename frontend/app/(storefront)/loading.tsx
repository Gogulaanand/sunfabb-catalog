export default function StorefrontLoading() {
  return (
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop)">
      {/* Hero skeleton */}
      <div className="w-full aspect-[16/7] rounded-none bg-surface-container animate-pulse" />

      {/* Category tiles skeleton */}
      <div className="py-(--spacing-margin-mobile) md:py-16 space-y-10">
        <div className="h-6 w-40 rounded bg-surface-container-high animate-pulse mx-auto" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-md bg-surface-container animate-pulse" />
          ))}
        </div>
      </div>

      {/* Featured products skeleton */}
      <div className="pb-16 space-y-6">
        <div className="h-6 w-48 rounded bg-surface-container-high animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-(--spacing-gutter-desktop)">
          {Array.from({ length: 3 }).map((_, i) => (
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
