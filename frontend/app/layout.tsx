import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sunfabb — Home Textiles",
  description: "Premium home textiles — bedspreads, towels, napkins and table linen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <header className="border-b border-zinc-200 sticky top-0 z-30 bg-white/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              Sunfabb
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600">
              <Link href="/catalog" className="hover:text-zinc-900 transition-colors">
                Catalog
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 py-8 text-center text-sm text-zinc-500">
          © {new Date().getFullYear()} Sunfabb. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
