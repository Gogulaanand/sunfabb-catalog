import type { MDXComponents } from "mdx/types";
import Link from "next/link";

// Global MDX element mapping. Guides are long-form editorial content, so every
// element is mapped explicitly onto the Ethos & Hearth tokens instead of
// pulling in @tailwindcss/typography — `prose` ships its own type scale and
// colours, which would visibly diverge from the rest of the storefront.
//
// This file is a required file convention for @next/mdx with the App Router.
const components: MDXComponents = {
  h2: ({ children }) => (
    <h2 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mt-12 mb-4 scroll-mt-24">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-display text-title-sm text-on-surface mt-8 mb-3 scroll-mt-24">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-body-md text-on-surface-variant mb-5">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-5 space-y-2 text-body-md text-on-surface-variant marker:text-primary">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-5 space-y-2 text-body-md text-on-surface-variant marker:text-primary">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-on-surface">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary pl-5 my-8 text-body-md text-on-surface-variant italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-outline-variant" />,
  // Tables carry most of the fact density in these guides (GSM ranges, bed
  // sizes), so they get an explicit scroll container — a wide table must never
  // make the page itself scroll sideways on mobile.
  table: ({ children }) => (
    <div className="my-8 overflow-x-auto">
      <table className="w-full border-collapse text-body-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-outline-variant">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="text-left py-3 pr-6 text-label-caps uppercase text-on-surface-variant whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-3 pr-6 align-top text-on-surface-variant border-b border-outline-variant/50">
      {children}
    </td>
  ),
  a: ({ href, children }) => {
    const isInternal = href?.startsWith("/");
    if (isInternal) {
      return (
        <Link
          href={href}
          className="text-primary underline underline-offset-4 hover:text-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
        >
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-4 hover:text-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
      >
        {children}
      </a>
    );
  },
};

export function useMDXComponents(): MDXComponents {
  return components;
}
