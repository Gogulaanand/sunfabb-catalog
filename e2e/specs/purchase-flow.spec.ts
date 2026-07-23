import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:3000';
const CUSTOMER_EMAIL =
  process.env.E2E_CUSTOMER_EMAIL ?? 'e2e-customer@sunfabb.com';
const CUSTOMER_PASSWORD =
  process.env.E2E_CUSTOMER_PASSWORD ?? 'TestCustomerPassword123!';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@sunfabb.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'TestPassword123!';
const PAYMENT_SECRET = process.env.RAZORPAY_KEY_SECRET ?? 'e2e-test-key-secret';

async function installRazorpayStub(page: Page) {
  const script = `
    window.Razorpay = class {
      constructor(options) { this.options = options; }
      open() {
        const paymentId = "pay_e2e_" + this.options.order_id;
        const data = new TextEncoder().encode(this.options.order_id + "|" + paymentId);
        const secret = new TextEncoder().encode(${JSON.stringify(PAYMENT_SECRET)});
        crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
          .then((key) => crypto.subtle.sign("HMAC", key, data))
          .then((signature) => {
            const hex = Array.from(new Uint8Array(signature))
              .map((value) => value.toString(16).padStart(2, "0"))
              .join("");
            this.options.handler({
              razorpay_payment_id: paymentId,
              razorpay_order_id: this.options.order_id,
              razorpay_signature: hex,
            });
          });
      }
    };
  `;

  await page.route('https://checkout.razorpay.com/v1/checkout.js', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: script,
    }),
  );
}

async function loginCustomer(page: Page) {
  await page.goto('/account/login');
  await page.getByLabel('Email').fill(CUSTOMER_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(CUSTOMER_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL('/account');
}

async function ensureAddress(page: Page) {
  await page.getByRole('button', { name: '+ Add address' }).click();
  await page.getByLabel('Full name').fill('E2E Customer');
  await page.getByLabel('Phone').fill('+91 98765 43210');
  await page.getByLabel('Address line 1').fill('12 Test Street');
  await page.getByLabel('City').fill('Bengaluru');
  await page.getByLabel('State').fill('Karnataka');
  await page.getByLabel('PIN code').fill('560001');
  await page.getByLabel('Set as default address').check();
  await page.getByRole('button', { name: 'Save address' }).click();
  await expect(page.getByText('12 Test Street').first()).toBeVisible();
}

async function loginDirectly(
  request: APIRequestContext,
  path: string,
  body: Record<string, string>,
) {
  const response = await request.post(`${BACKEND_URL}${path}`, { data: body });
  expect(response.ok()).toBeTruthy();
  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('access_token' in payload) ||
    typeof payload.access_token !== 'string'
  ) {
    throw new Error('Authentication response did not contain an access token');
  }
  return payload.access_token;
}

test.describe.serial('Phase 6.9 purchase and principal boundaries', () => {
  test('completes a customer purchase through the real built app boundary', async ({
    page,
  }) => {
    await installRazorpayStub(page);
    await loginCustomer(page);
    await ensureAddress(page);

    await page.goto('/catalog/heritage-linen-bedspread');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(
      page.getByRole('button', { name: 'Added to Cart' }),
    ).toBeVisible();

    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
    await page.getByRole('button', { name: 'Place Order' }).click();

    await expect(page).toHaveURL(/\/account\/orders\/SF-/);
    await page.reload();
    await expect(page.getByText('Paid')).toBeVisible();
    await expect(page.getByText('Heritage Linen Bedspread')).toBeVisible();
    const itemTotal = page
      .getByText('Heritage Linen Bedspread')
      .locator('..')
      .locator('..')
      .locator('p')
      .last();
    const orderTotal = page
      .getByText('Total')
      .locator('..')
      .locator('span')
      .last();
    await expect(itemTotal).toHaveText(/^₹[\d,]+\.\d{2}$/);
    await expect(orderTotal).toHaveText((await itemTotal.textContent()) ?? '');
    await page.goto('/cart');
    await expect(page.getByText('Your cart is empty')).toBeVisible();
  });

  test('keeps customer and admin JWT principals isolated', async ({
    request,
  }) => {
    const customerToken = await loginDirectly(request, '/auth/customer/login', {
      email: CUSTOMER_EMAIL,
      password: CUSTOMER_PASSWORD,
    });
    const adminToken = await loginDirectly(request, '/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    const customerCallingAdmin = await request.get(
      `${BACKEND_URL}/products/admin`,
      {
        headers: { Authorization: `Bearer ${customerToken}` },
      },
    );
    const adminCallingCustomer = await request.get(`${BACKEND_URL}/me/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(customerCallingAdmin.status()).toBe(401);
    expect(adminCallingCustomer.status()).toBe(401);
  });
});
