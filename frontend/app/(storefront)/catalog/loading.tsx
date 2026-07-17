import CatalogGridSkeleton from "./CatalogGridSkeleton";

export default function CatalogLoading() {
  return (
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-16">
      <div className="h-4 w-32 rounded bg-surface-container animate-pulse mb-6" />
      <div className="h-8 w-72 rounded bg-surface-container-high animate-pulse mb-2" />
      <div className="h-4 w-96 rounded bg-surface-container animate-pulse mb-10" />
      <CatalogGridSkeleton />
    </div>
  );
}
