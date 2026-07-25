import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@sunfabb.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "TestPassword123!";

// Unique per run so re-runs against a persistent DB don't collide on
// unique constraints (slug/name).
const RUN_ID = `${Date.now()}`.slice(-6);

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/admin");
}

test.describe.serial("golden path: storefront browse + admin CRUD", () => {
  test("home page loads with navigation and featured content", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Bedspreads" }).first()).toBeVisible();
  });

  test("catalog lists products and a category filter narrows results", async ({ page }) => {
    await page.goto("/catalog");
    await expect(page.getByText("Heritage Linen Bedspread")).toBeVisible();
    await expect(page.getByText("Turkish Cotton Bath Towel")).toBeVisible();

    await page.getByRole("checkbox", { name: "Bedspreads" }).click();
    await expect(page).toHaveURL(/category=bedspreads/);
    await expect(page.getByText("Heritage Linen Bedspread")).toBeVisible();
    await expect(page.getByText("Turkish Cotton Bath Towel")).not.toBeVisible();
  });

  // The colour filter is judged by shoppers on the photo, not the result
  // count: it once returned the right products still wearing their default
  // colourway's photo, which reads as a filter that did nothing.
  test("color filter narrows results and cards show that colour's photo", async ({
    page,
  }) => {
    await page.goto("/catalog");

    // "Navy Blue" is a seeded colour with variants across several products, so
    // this exercises the fallback-free path on a multi-product result set.
    const swatch = page.getByRole("button", { name: "Navy Blue" });
    await expect(swatch).toBeVisible();

    const unfilteredCount = await page.locator('a[href^="/catalog/"]').count();

    await swatch.click();
    await expect(page).toHaveURL(/color=/);
    await expect(swatch).toHaveAttribute("aria-pressed", "true");

    const cards = page.locator('a[href^="/catalog/"]');
    await expect(cards.first()).toBeVisible();
    // The filter has to actually narrow, or the image assertion below could
    // pass against an unfiltered grid.
    await expect
      .poll(async () => cards.count())
      .toBeLessThan(unfilteredCount);

    // Every surviving card must advertise the filtered colour, not the
    // product's default one. This is the symptom the fix addresses: the right
    // products showing the wrong colourway's photo.
    const alts = await cards
      .locator("img")
      .evaluateAll((els) =>
        els.map((el) => (el as HTMLImageElement).alt.toLowerCase()),
      );
    expect(alts.length).toBeGreaterThan(0);
    for (const alt of alts) {
      expect(alt).toContain("navy blue");
    }
  });

  test("product detail page shows name, price, and variant options", async ({ page }) => {
    await page.goto("/catalog/heritage-linen-bedspread");
    await expect(page.getByRole("heading", { name: "Heritage Linen Bedspread" })).toBeVisible();
    await expect(page.getByText(/₹/).first()).toBeVisible();
  });

  test("admin login with valid credentials reaches the dashboard", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL("/admin");
    await expect(page.getByRole("navigation").getByRole("link", { name: "Categories" })).toBeVisible();
  });

  test("admin login with invalid credentials is rejected", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL("/admin/login");
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  const categoryName = `E2E Category ${RUN_ID}`;
  const categorySlug = `e2e-category-${RUN_ID}`;
  const productName = `E2E Product ${RUN_ID}`;
  const productSlug = `e2e-product-${RUN_ID}`;

  test("admin can create a category", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/categories");
    await page.getByRole("button", { name: "Add category" }).click();
    await page.getByLabel("Name").fill(categoryName);
    await page.getByLabel("Slug").fill(categorySlug);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("cell", { name: categoryName })).toBeVisible();
  });

  test("admin can create a product in the new category", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/products");
    await page.getByRole("button", { name: "Add product" }).click();
    await page.getByLabel("Name").fill(productName);
    await page.getByLabel("Slug").fill(productSlug);
    await page.getByLabel("Category").selectOption({ label: categoryName });
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page).toHaveURL(`/admin/products/${productSlug}`);
    await expect(page.getByRole("heading", { name: productName })).toBeVisible();
  });

  test("admin can add and then remove a variant", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/admin/products/${productSlug}`);

    await page.getByRole("button", { name: "Add variant" }).click();
    await page.getByLabel("Size").fill("Standard");
    await page.getByLabel("Price (₹)").fill("999.00");
    await page.getByLabel("Stock quantity").fill("5");
    await page.getByLabel("SKU").fill(`E2E-${RUN_ID}`);
    await page.getByRole("button", { name: "Save" }).click();

    const variantRow = page.getByRole("row", { name: new RegExp(`E2E-${RUN_ID}`) });
    await expect(variantRow).toBeVisible();

    await variantRow.getByRole("button", { name: "Remove" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("No variants yet.")).toBeVisible();
  });
});
