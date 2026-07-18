export const ENABLE_PAGE_TRANSITIONS = true;

export default function StorefrontTemplate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={
        ENABLE_PAGE_TRANSITIONS ? "storefront-page-transition" : undefined
      }
    >
      {children}
    </div>
  );
}
