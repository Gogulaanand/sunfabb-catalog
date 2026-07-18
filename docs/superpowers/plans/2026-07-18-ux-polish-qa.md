# UX Polish QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase F on the Phase E storefront with a removable page fade, branded route fallbacks, and recorded QA evidence.

**Architecture:** Keep the App Router server-component structure. Add a route-group `template.tsx` that applies one optional CSS class on each storefront render; keep animation in global CSS so the feature can be removed without touching navigation. Upgrade only the existing fallback pages and use the existing `Reveal` client leaf for entrance motion. QA uses the existing Vitest setup plus Playwright/browser tooling against a production build.

**Tech Stack:** Next.js 16.2.6, React 19.2.4, Tailwind CSS v4, Motion 12, Vitest, Playwright, Lighthouse.

## Global Constraints

- Do not enable Next.js `experimental.viewTransition`; the official docs still advise against production use.
- Use one boolean/class to make the page transition removable.
- Respect `prefers-reduced-motion` and the existing `MotionProvider` behavior.
- Storefront pages must not import Chakra or Emotion.
- Preserve `error.tsx` logging/reset behavior and fallback navigation behavior.
- Do not change API contracts, checkout behavior, or route URLs.
- QA targets are Lighthouse performance >= 90 and accessibility >= 95 on home, catalog, and one PDP.

---

### Task 1: Add the removable storefront page fade

**Files:**
- Create: `frontend/app/(storefront)/template.tsx`
- Modify: `frontend/app/globals.css`
- Create: `frontend/app/(storefront)/template.test.tsx`

**Interfaces:**
- Produces `StorefrontTemplate` and the `ENABLE_PAGE_TRANSITIONS` toggle used only by this route group.

- [ ] **Step 1: Write the failing test**

Create a test that renders `StorefrontTemplate` with a child marker and asserts the enabled class is present. Export the boolean so the test can also assert the toggle is a single removable control.

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StorefrontTemplate, { ENABLE_PAGE_TRANSITIONS } from "./template";

describe("StorefrontTemplate", () => {
  it("wraps navigated storefront content in the optional transition class", () => {
    render(
      <StorefrontTemplate>
        <span>page content</span>
      </StorefrontTemplate>,
    );

    expect(ENABLE_PAGE_TRANSITIONS).toBe(true);
    expect(screen.getByText("page content").parentElement).toHaveClass(
      "storefront-page-transition",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run 'app/(storefront)/template.test.tsx'`

Expected: FAIL because `template.tsx` and its exported toggle do not exist.

- [ ] **Step 3: Write the minimal implementation**

Create `frontend/app/(storefront)/template.tsx`:

```tsx
export const ENABLE_PAGE_TRANSITIONS = true;

export default function StorefrontTemplate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={ENABLE_PAGE_TRANSITIONS ? "storefront-page-transition" : undefined}>
      {children}
    </div>
  );
}
```

Append to `frontend/app/globals.css`:

```css
@keyframes storefront-page-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.storefront-page-transition {
  animation: storefront-page-fade-in 200ms var(--ease-out-expo) both;
}

@media (prefers-reduced-motion: reduce) {
  .storefront-page-transition {
    animation: none;
  }
}
```

- [ ] **Step 4: Run the focused test**

Run: `cd frontend && npx vitest run 'app/(storefront)/template.test.tsx'`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add 'frontend/app/(storefront)/template.tsx' 'frontend/app/(storefront)/template.test.tsx' frontend/app/globals.css
git commit -m "feat(storefront): add removable page fade"
```

### Task 2: Give not-found and error routes the branded content pass

**Files:**
- Modify: `frontend/app/(storefront)/not-found.tsx`
- Modify: `frontend/app/(storefront)/error.tsx`
- Create: `frontend/app/(storefront)/fallback-pages.test.tsx`

**Interfaces:**
- Consumes: `Reveal` from `@/components/motion`, Next `Link`, and the existing `reset` callback.
- Produces: branded fallback markup with home/catalog links and an error retry button.

- [ ] **Step 1: Write the failing tests**

Mock `Reveal` as a transparent wrapper and render both pages. Assert the user-facing headline/copy, required navigation links, and retry action.

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";
import StorefrontError from "./error";

vi.mock("@/components/motion", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("storefront fallback pages", () => {
  it("helps visitors recover from a missing page", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: /page has wandered off/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse catalog/i })).toHaveAttribute("href", "/catalog");
    expect(screen.getByRole("link", { name: /return home/i })).toHaveAttribute("href", "/");
  });

  it("offers retry, catalog, and home recovery actions after an error", () => {
    const reset = vi.fn();
    render(<StorefrontError error={new Error("test")} reset={reset} />);

    expect(screen.getByRole("heading", { name: /a little interruption/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse catalog/i })).toHaveAttribute("href", "/catalog");
    expect(screen.getByRole("link", { name: /return home/i })).toHaveAttribute("href", "/");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run 'app/(storefront)/fallback-pages.test.tsx'`

Expected: FAIL because the current skeleton headlines and links do not match the branded contract.

- [ ] **Step 3: Implement the branded pages**

Implement `not-found.tsx` with this complete structure:

```tsx
import Link from "next/link";
import { Reveal } from "@/components/motion";

export default function StorefrontNotFound() {
  return (
    <section className="min-h-[28rem] px-5 py-24 md:px-(--spacing-margin-desktop) md:py-32" aria-labelledby="not-found-title">
      <Reveal className="mx-auto flex max-w-xl flex-col items-center text-center">
        <p className="text-label-caps text-primary">A quiet corner</p>
        <div className="my-6 h-px w-16 bg-primary" aria-hidden="true" />
        <h1 id="not-found-title" className="font-display text-headline-md-mobile text-on-surface md:text-headline-md">
          This page has wandered off.
        </h1>
        <p className="mt-5 max-w-md text-body-md text-on-surface-variant">
          The piece you were looking for is not here, but there are still plenty of beautiful things to discover.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/catalog" className="rounded-full bg-primary px-6 py-3 text-label-caps text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            Browse catalog
          </Link>
          <Link href="/" className="rounded-full border border-outline-variant px-6 py-3 text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            Return home
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
```

Implement `error.tsx` with the same layout and this content/action block while retaining the existing client directive and logging effect:

```tsx
<p className="text-label-caps text-primary">A little interruption</p>
<div className="my-6 h-px w-16 bg-primary" aria-hidden="true" />
<h1 id="storefront-error-title" className="font-display text-headline-md-mobile text-on-surface md:text-headline-md">
  We&apos;ll find our way back.
</h1>
<p className="mt-5 max-w-md text-body-md text-on-surface-variant">
  This page did not finish setting the table. Try again, or take a moment to browse the collection while we reset things.
</p>
<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
  <button type="button" onClick={reset} className="rounded-full bg-primary px-6 py-3 text-label-caps text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
    Try again
  </button>
  <Link href="/catalog" className="rounded-full border border-outline-variant px-6 py-3 text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
    Browse catalog
  </Link>
  <Link href="/" className="rounded-full border border-outline-variant px-6 py-3 text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
    Return home
  </Link>
</div>
```

Wrap the complete section content in `<Reveal>` and keep the error `useEffect(() => console.error(error), [error])` and `reset` callback unchanged.

- [ ] **Step 4: Run the focused tests and lint**

Run: `cd frontend && npx vitest run 'app/(storefront)/fallback-pages.test.tsx' && npm run lint -- 'app/(storefront)/not-found.tsx' 'app/(storefront)/error.tsx'`

Expected: PASS with no lint errors.

- [ ] **Step 5: Commit**

```bash
git add 'frontend/app/(storefront)/not-found.tsx' 'frontend/app/(storefront)/error.tsx' 'frontend/app/(storefront)/fallback-pages.test.tsx'
git commit -m "feat(storefront): brand route fallback pages"
```

### Task 3: Run the full verification and record Phase F evidence

**Files:**
- Create: `phases/briefing/phase-f-ux-polish-qa.md`
- Modify: `HANDOFF.md`
- QA output: local screenshot/Lighthouse artifacts outside the committed source tree unless an existing ignored output directory is available

**Interfaces:**
- Consumes: the storefront production build and the routes `/`, `/catalog`, one valid `/catalog/[slug]`, `/cart`, `/checkout`, `/contact`, and `/account`.
- Produces: reproducible command results and a concise evidence table with actual scores/findings.

- [ ] **Step 1: Run frontend unit/lint/build verification**

Run:

```bash
cd frontend
npm run lint
npm test
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3000}" npm run build
```

Expected: lint exits 0, Vitest reports 0 failures, and `next build` exits 0.

- [ ] **Step 2: Start the production frontend/backend and verify the browser**

Use the existing e2e start conventions or start the backend and frontend on their configured ports. Use `agent-browser` to open the frontend, wait for `networkidle`, inspect a snapshot, check for a Next error overlay, check that `document.body.innerText` is non-empty, and capture screenshots at desktop `1280x800` and mobile `390x844` for every required storefront route. For `/catalog/[slug]`, use a slug present in the live catalog response; for `/account`, record whether authentication is required and use the available authenticated state if configured.

- [ ] **Step 3: Run Lighthouse audits**

Run Lighthouse against the production frontend for `/`, `/catalog`, and the selected PDP at mobile or desktop with the same backend data state. Record performance, accessibility, best practices, SEO, and the exact URLs. Treat performance < 90 or accessibility < 95 as a failed target requiring investigation before completion.

- [ ] **Step 4: Perform keyboard and reduced-motion checks**

With browser tooling, use only keyboard input to traverse header links, mobile menu controls, catalog filters/pagination, PDP gallery/variants/add-to-cart, cart/checkout controls, contact fields, account controls, and fallback actions. Confirm visible focus and no keyboard trap. Emulate `prefers-reduced-motion: reduce`, navigate between two storefront routes, inspect computed animation styles, and confirm the page fade is disabled while content remains visible.

- [ ] **Step 5: Document findings**

Write `phases/briefing/phase-f-ux-polish-qa.md` with the commit/base, route × viewport matrix, screenshot directory, Lighthouse scores, keyboard result, reduced-motion result, console/network errors, known backend/auth/data limitations, and any target failures. Update `HANDOFF.md` to mark Phase F as in review/complete only to the extent the evidence supports.

- [ ] **Step 6: Run final verification and inspect the diff**

Run `git status --short`, `git diff --check`, `npm test`, `npm run lint`, and `npm run build` fresh. Review `git diff main...HEAD --stat` and `git diff main...HEAD` for scope, then commit the documentation changes.
