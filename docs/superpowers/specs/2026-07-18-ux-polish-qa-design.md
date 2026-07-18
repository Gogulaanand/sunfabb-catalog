# UX Polish QA Design

**Date:** 2026-07-18  
**Branch:** `feature/ux-polish-qa`  
**Base:** `main` at `a7d439a` (Phase E)

## Goal

Finish Phase F by adding a restrained, removable storefront page fade, giving the route fallbacks a complete Ethos & Hearth presentation, and producing evidence for desktop/mobile, performance, accessibility, keyboard, and reduced-motion quality across the storefront.

## Design decisions

### Cross-page transition

Next.js 16.2.6 and React 19.2.4 contain View Transition support, but Next exposes it behind `experimental.viewTransition`. The official Next.js documentation still describes this integration as experimental and advises against production use. Phase F will therefore use a CSS-only template fade.

`frontend/app/(storefront)/template.tsx` will wrap each storefront route render in a class controlled by one module-level `ENABLE_PAGE_TRANSITIONS` boolean. The class will apply a short opacity-only animation defined in `frontend/app/globals.css`. Removing the class or flipping the boolean disables the behavior without changing route code. `prefers-reduced-motion: reduce` will disable the animation.

### Branded route fallbacks

`not-found.tsx` and `error.tsx` will remain in the storefront route group and keep their existing functional behavior. Their content will use the existing Playfair/Inter and Ethos & Hearth tokens: an editorial eyebrow, Playfair headline, terracotta decorative accent, plain-language recovery copy, and pill-shaped navigation/actions. `Reveal` will wrap the complete content block so the entrance uses the existing motion vocabulary and automatically respects the global reduced-motion setting. Error logging and `reset()` remain unchanged.

### QA evidence

The QA pass will exercise the storefront routes for home, catalog, one PDP, cart, checkout, contact, and account at desktop and mobile viewport sizes. Browser screenshots will be stored under a gitignored local QA output directory or another existing test-output location; the committed briefing will record route coverage, viewport sizes, Lighthouse scores, keyboard findings, reduced-motion findings, and any environment/data limitations. Lighthouse will run against a production build on home, catalog, and one PDP, targeting performance >= 90 and accessibility >= 95. Keyboard-only checks will verify skip/navigation access, visible focus, mobile menu, catalog filters/pagination, PDP controls, cart/checkout controls, and fallback-page actions.

## Testing strategy

- Add focused component tests for the branded fallback copy, expected recovery links/actions, and the transition template’s enabled/disabled class behavior where the existing Vitest setup can render them.
- Run the frontend lint, Vitest suite, and production build.
- Use the browser tooling for route screenshots, console/error checks, keyboard traversal, and reduced-motion verification.
- Run Lighthouse against home, catalog, and a representative PDP and record the measured scores rather than claiming thresholds without evidence.

## Files in scope

- Create: `frontend/app/(storefront)/template.tsx`
- Modify: `frontend/app/globals.css`
- Modify: `frontend/app/(storefront)/not-found.tsx`
- Modify: `frontend/app/(storefront)/error.tsx`
- Create or modify: focused fallback/template tests near the implementation files
- Create: `phases/briefing/phase-f-ux-polish-qa.md`
- Modify: `HANDOFF.md`

No new UI dependency, Chakra/Emotion import, route behavior, API contract, or checkout behavior is planned.
