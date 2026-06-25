import Link from "next/link";

export default function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-outline-variant">
        <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) h-20 flex items-center">
          <Link
            href="/"
            className="font-display text-2xl text-primary tracking-tight"
          >
            Sunfabb
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
