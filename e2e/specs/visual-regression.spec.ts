import { test, expect } from "@playwright/test";

// Visual regression baselines must be generated in CI (ubuntu-latest, pinned
// Chromium) — font rendering differs across OSes, so local-machine snapshots
// would never match CI's. This suite is wired as a non-blocking CI job until
// a few runs prove the baselines are stable (see Phase 5.7 plan, Step 7).

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@sunfabb.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "TestPassword123!";

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
} as const;

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`visual regression — ${device}`, () => {
    test.use({ viewport });

    test(`home page (${device})`, async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveScreenshot(`home-${device}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`catalog page (${device})`, async ({ page }) => {
      await page.goto("/catalog");
      await expect(page).toHaveScreenshot(`catalog-${device}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`product detail page (${device})`, async ({ page }) => {
      await page.goto("/catalog/heritage-linen-bedspread");
      await expect(page).toHaveScreenshot(`product-detail-${device}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`admin login page (${device})`, async ({ page }) => {
      await page.goto("/admin/login");
      await expect(page).toHaveScreenshot(`admin-login-${device}.png`, {
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`admin categories list (${device})`, async ({ page }) => {
      await page.goto("/admin/login");
      await page.getByLabel("Email").fill(ADMIN_EMAIL);
      await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
      await page.getByRole("button", { name: "Log in" }).click();
      await expect(page).toHaveURL("/admin");

      await page.goto("/admin/categories");
      await expect(page).toHaveScreenshot(`admin-categories-${device}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  });
}
