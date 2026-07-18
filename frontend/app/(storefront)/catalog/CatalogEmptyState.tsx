import Link from "next/link";

interface CatalogEmptyStateProps {
  hasFilters: boolean;
}

export function CatalogEmptyState({ hasFilters }: CatalogEmptyStateProps) {
  return (
    <div className="py-24 flex flex-col items-center text-center gap-6">
      <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
        <svg
          viewBox="0 0 48 48"
          className="w-10 h-10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="21" cy="21" r="13" />
          <line x1="31" y1="31" x2="42" y2="42" />
          <line x1="16" y1="17" x2="26" y2="25" />
          <line x1="26" y1="17" x2="16" y2="25" />
        </svg>
      </div>
      <div>
        <p className="text-title-sm text-on-surface mb-2">No products found</p>
        <p className="text-body-sm text-on-surface-variant">
          {hasFilters
            ? "No items match your current filters."
            : "There are no products in this catalog yet."}
        </p>
      </div>
      {hasFilters && (
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-primary text-primary text-body-sm font-medium transition-all duration-150 hover:bg-primary hover:text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Clear all filters
        </Link>
      )}
    </div>
  );
}
