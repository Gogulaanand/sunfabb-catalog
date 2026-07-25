interface CategoryIntroProps {
  /** Category description from the backend. Nullable — most are still empty. */
  description: string | null | undefined;
}

/**
 * Intro copy for a category-filtered catalog view.
 *
 * Renders nothing at all when the category has no description, which is the
 * common case today: `Category.description` exists in the schema but most rows
 * are still blank. An empty bordered box would look like a broken component.
 */
export function CategoryIntro({ description }: CategoryIntroProps) {
  const trimmed = description?.trim();
  if (!trimmed) return null;

  return (
    <p className="text-body-md text-on-surface-variant max-w-2xl mb-10 -mt-4">
      {trimmed}
    </p>
  );
}
