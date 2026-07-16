import Link from "next/link";
import CartIcon from "@/components/cart/cart-icon";
import Footer from "@/components/storefront/footer";

export default function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-outline-variant sticky top-0 z-30 bg-surface/95 backdrop-blur-sm">
        <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) h-20 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-2xl text-primary tracking-tight"
          >
            Sunfabb
          </Link>
          <nav className="hidden sm:flex items-center gap-8 text-label-caps text-on-surface-variant">
            <Link href="/catalog?category=bedspreads" className="hover:text-primary transition-colors">
              Bedspreads
            </Link>
            <Link href="/catalog?category=towels" className="hover:text-primary transition-colors">
              Towels
            </Link>
            <Link href="/catalog?category=table-linen" className="hover:text-primary transition-colors">
              Table Linen
            </Link>
            <Link href="/catalog" className="hover:text-primary transition-colors">
              All Products
            </Link>
            <Link href="/contact" className="hover:text-primary transition-colors">
              Contact
            </Link>
          </nav>

          {/* Right-side actions: cart icon + account (desktop), cart + hamburger (mobile) */}
          <div className="flex items-center gap-1">
            <CartIcon />
            <Link
              href="/account"
              className="hidden sm:inline text-label-caps text-on-surface-variant hover:text-primary transition-colors ml-4"
            >
              Account
            </Link>

          <details className="sm:hidden relative">
            <summary
              className="list-none cursor-pointer p-2 -mr-2 flex items-center justify-center"
              aria-label="Open menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-on-surface"
              >
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              </svg>
            </summary>
            <nav className="absolute right-0 top-full mt-2 w-48 bg-surface border border-outline-variant rounded-md shadow-lg py-2 flex flex-col z-40 text-label-caps text-on-surface-variant">
              <Link
                href="/catalog?category=bedspreads"
                className="px-4 py-3 hover:text-primary hover:bg-surface-container-low transition-colors"
              >
                Bedspreads
              </Link>
              <Link
                href="/catalog?category=towels"
                className="px-4 py-3 hover:text-primary hover:bg-surface-container-low transition-colors"
              >
                Towels
              </Link>
              <Link
                href="/catalog?category=table-linen"
                className="px-4 py-3 hover:text-primary hover:bg-surface-container-low transition-colors"
              >
                Table Linen
              </Link>
              <Link
                href="/catalog"
                className="px-4 py-3 hover:text-primary hover:bg-surface-container-low transition-colors"
              >
                All Products
              </Link>
              <Link
                href="/contact"
                className="px-4 py-3 hover:text-primary hover:bg-surface-container-low transition-colors"
              >
                Contact
              </Link>
            </nav>
          </details>
          </div>{/* end right-side actions */}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
