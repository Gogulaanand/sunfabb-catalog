import Link from "next/link";

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
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-outline-variant bg-surface-container-low">
        <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-12">
          <p className="font-display text-xl text-primary mb-2">Sunfabb</p>
          <p className="text-body-sm text-on-surface-variant max-w-md mb-8">
            Premium bedspreads, towels, napkins and table linen — made in India, built to last.
          </p>
          <p className="text-body-sm text-outline">
            © {new Date().getFullYear()} Sunfabb. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
