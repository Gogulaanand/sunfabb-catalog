"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import CartIcon from "@/components/cart/cart-icon";
import { isTransactionalCommerceEnabled } from "@/lib/storefront-mode";
import type { Category } from "@/lib/api";

const FIXED_NAV_LINKS = [
  { href: "/catalog", label: "All Products" },
  { href: "/guides", label: "Guides" },
  { href: "/contact", label: "Contact" },
];

type PublicCategory = Pick<Category, "name" | "slug">;

export function buildNavLinks(categories: PublicCategory[]) {
  return [
    ...categories.map((category) => ({
      href: `/catalog?category=${encodeURIComponent(category.slug)}`,
      label: category.name,
    })),
    ...FIXED_NAV_LINKS,
  ];
}

const COMPACT_SCROLL_Y = 40;
const EXPAND_SCROLL_Y = 8;

export function isHomeRoute(pathname: string | null) {
  return pathname === "/";
}

export function shouldCompactHeader(scrollY: number, isCompact: boolean) {
  return isCompact
    ? scrollY > EXPAND_SCROLL_Y
    : scrollY > COMPACT_SCROLL_Y;
}

export function Header({ categories = [] }: { categories?: PublicCategory[] }) {
  const pathname = usePathname();
  const isHome = isHomeRoute(pathname);
  const transactionalCommerceEnabled = isTransactionalCommerceEnabled();
  const navLinks = buildNavLinks(categories);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const openBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled((isCompact) =>
        shouldCompactHeader(window.scrollY, isCompact),
      );
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Body scroll lock while menu is open. Restore any existing lock rather than
  // unconditionally clearing a lock owned by another surface.
  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  // Esc key closes the menu
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  // Focus trap inside the panel
  useEffect(() => {
    if (!menuOpen || !menuRef.current) return;
    const panel = menuRef.current;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button, [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
    // Return focus to the hamburger button
    setTimeout(() => openBtnRef.current?.focus(), 0);
  }

  const isHomeAtTop = isHome && !scrolled;
  const mutedText = isHomeAtTop
    ? "text-white/85"
    : scrolled
      ? "text-inverse-on-surface/80"
      : "text-on-surface-variant";
  const interactiveText = isHomeAtTop
    ? "hover:text-white"
    : scrolled
      ? "hover:text-inverse-primary"
      : "hover:text-primary";
  const focusRing = isHomeAtTop
    ? "focus-visible:ring-white focus-visible:ring-offset-0"
    : "focus-visible:ring-primary focus-visible:ring-offset-2";
  const linkFocus = `rounded focus-visible:outline-none focus-visible:ring-2 ${focusRing}`;
  const cartTone = isHomeAtTop
    ? "[&_a]:!text-white [&_a:hover]:!text-white"
    : scrolled
      ? "[&_a]:!text-inverse-on-surface [&_a:hover]:!text-inverse-primary"
      : "[&_a]:!text-on-surface [&_a:hover]:!text-primary";
  const headerClassName = [
    "top-0 z-30 w-full transition-[height,background-color,box-shadow,border-color,color] duration-[150ms] ease-out",
    isHome ? "fixed" : "sticky",
    scrolled
      ? "h-14 border-b border-inverse-on-surface/15 bg-inverse-surface/95 text-inverse-on-surface shadow-lg backdrop-blur-md"
      : isHome
        ? "h-20 border-b border-white/15 bg-home-graphite/30 text-white backdrop-blur-sm"
        : "h-20 border-b border-outline-variant bg-surface/95 text-on-surface shadow-sm backdrop-blur-sm",
  ].join(" ");

  return (
    <>
      <header className={headerClassName}>
        <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) h-full flex items-center justify-between">
          <Link
            href="/"
            className={`font-display text-2xl tracking-tight ${
              isHomeAtTop ? "text-white" : scrolled ? "text-inverse-primary" : "text-primary"
            } ${linkFocus}`}
          >
            SUN FABB
          </Link>

          <nav className={`hidden sm:flex items-center gap-8 text-label-caps ${mutedText}`}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${interactiveText} transition-colors ${linkFocus}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className={`flex items-center gap-1 ${mutedText}`}>
            {transactionalCommerceEnabled && (
              <span className={cartTone}>
                <CartIcon />
              </span>
            )}
            {!transactionalCommerceEnabled && (
              <Link
                href="/contact"
                className={`font-label ml-3 hidden min-h-10 items-center rounded-sm border px-5 text-xs font-bold uppercase tracking-[0.14em] sm:inline-flex ${
                  isHomeAtTop
                    ? "border-white bg-white text-home-graphite hover:bg-white/90"
                    : scrolled
                      ? "border-inverse-primary bg-inverse-primary text-inverse-surface hover:bg-inverse-primary/90"
                      : "border-primary bg-primary text-on-primary hover:bg-primary/90"
                } ${linkFocus}`}
              >
                Ask us
              </Link>
            )}
            {transactionalCommerceEnabled && (
              <Link
                href="/account"
                className={`hidden sm:inline text-label-caps ${interactiveText} transition-colors ml-4 ${linkFocus}`}
              >
                Account
              </Link>
            )}

            <button
              ref={openBtnRef}
              type="button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen(true)}
              className={`sm:hidden p-2 -mr-2 flex items-center justify-center ${linkFocus}`}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className={isHomeAtTop ? "text-white" : "text-inherit"}
              >
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-on-surface/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.65, 0, 0.35, 1] as const }}
              onClick={closeMenu}
              aria-hidden="true"
            />
            <motion.div
              key="panel"
              ref={menuRef}
              id="mobile-menu"
              role="dialog"
              aria-label="Navigation menu"
              aria-modal="true"
              className="fixed top-0 right-0 z-50 flex h-full w-80 max-w-[calc(100vw-2rem)] flex-col bg-inverse-surface text-inverse-on-surface shadow-xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <div className="flex items-center justify-between px-5 h-20 border-b border-inverse-on-surface/15 shrink-0">
                <span className="font-display text-xl text-inverse-primary">SUN FABB</span>
                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label="Close menu"
                  className="p-2 -mr-2 text-inverse-on-surface/80 hover:text-inverse-on-surface rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-primary focus-visible:ring-offset-2 focus-visible:ring-offset-inverse-surface"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <nav className="flex flex-col py-2 text-label-caps text-inverse-on-surface/80 flex-1 overflow-y-auto">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className="px-5 py-4 hover:text-inverse-primary hover:bg-inverse-on-surface/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-primary focus-visible:ring-inset"
                  >
                    {link.label}
                  </Link>
                ))}
                {transactionalCommerceEnabled && (
                  <Link
                    href="/account"
                    onClick={closeMenu}
                    className="px-5 py-4 hover:text-inverse-primary hover:bg-inverse-on-surface/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-primary focus-visible:ring-inset"
                  >
                    Account
                  </Link>
                )}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
