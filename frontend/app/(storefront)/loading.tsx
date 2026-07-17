export default function StorefrontLoading() {
  return (
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-16">
      <div className="h-4 w-32 rounded bg-surface-container animate-pulse mb-6" />
      <div className="h-8 w-64 rounded bg-surface-container-high animate-pulse mb-2" />
      <div className="h-4 w-96 rounded bg-surface-container animate-pulse mb-10" />
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
  );
}
