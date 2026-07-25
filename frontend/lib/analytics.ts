import { sendGAEvent } from "@next/third-parties/google";

/**
 * GA4 e-commerce events.
 *
 * Everything funnels through `track()` so event shapes stay consistent and
 * unit-testable, and so a missing measurement ID is a silent no-op rather than
 * a console warning on every interaction in local development.
 *
 * Money crosses this boundary in paise (the app-wide convention, D6) and is
 * converted to rupees here, because GA4 expects major currency units. That
 * conversion lives in exactly one place on purpose.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const CURRENCY = "INR";

/** sessionStorage key prefix for purchase dedupe (D-W2-7). */
const PURCHASE_KEY_PREFIX = "sunfabb:purchase:";

export interface AnalyticsItem {
  /** SKU where available, product id otherwise. */
  item_id: string;
  item_name: string;
  /** Price in paise. Converted to rupees before it leaves this module. */
  price_paise: number;
  quantity?: number;
  item_category?: string;
  item_variant?: string;
  /** 1-based position within a list, for view_item_list. */
  index?: number;
}

interface GaItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_category?: string;
  item_variant?: string;
  index?: number;
}

export function paiseToRupees(paise: number): number {
  // Two decimal places: GA4 rejects long floats, and paise never needs more.
  return Math.round(paise) / 100;
}

export function toGaItem(item: AnalyticsItem): GaItem {
  const gaItem: GaItem = {
    item_id: item.item_id,
    item_name: item.item_name,
    price: paiseToRupees(item.price_paise),
    quantity: item.quantity ?? 1,
  };
  if (item.item_category !== undefined) gaItem.item_category = item.item_category;
  if (item.item_variant !== undefined) gaItem.item_variant = item.item_variant;
  if (item.index !== undefined) gaItem.index = item.index;
  return gaItem;
}

function sumValue(items: AnalyticsItem[]): number {
  return paiseToRupees(
    items.reduce(
      (total, item) => total + item.price_paise * (item.quantity ?? 1),
      0,
    ),
  );
}

/** Escape hatch for tests; production always goes through sendGAEvent. */
export function track(eventName: string, params: Record<string, unknown>) {
  if (!GA_ID) return;
  sendGAEvent("event", eventName, params);
}

export function trackViewItemList(
  items: AnalyticsItem[],
  listName: string,
  listId?: string,
) {
  if (items.length === 0) return;
  track("view_item_list", {
    item_list_name: listName,
    ...(listId ? { item_list_id: listId } : {}),
    items: items.map(toGaItem),
  });
}

export function trackViewItem(item: AnalyticsItem) {
  track("view_item", {
    currency: CURRENCY,
    value: paiseToRupees(item.price_paise),
    items: [toGaItem(item)],
  });
}

export function trackAddToCart(item: AnalyticsItem) {
  track("add_to_cart", {
    currency: CURRENCY,
    value: paiseToRupees(item.price_paise * (item.quantity ?? 1)),
    items: [toGaItem(item)],
  });
}

export function trackBeginCheckout(items: AnalyticsItem[]) {
  if (items.length === 0) return;
  track("begin_checkout", {
    currency: CURRENCY,
    value: sumValue(items),
    items: items.map(toGaItem),
  });
}

/**
 * Fires `purchase` at most once per order number per browser session.
 *
 * Deduping matters because the confirm step can be retried (a dropped
 * response, a double tap on the Razorpay handler) and a double-counted
 * purchase silently corrupts every revenue figure downstream.
 *
 * Returns true if the event was sent, false if it was suppressed as a repeat.
 */
export function trackPurchase(params: {
  orderNumber: string;
  /** Order total in paise. */
  totalPaise: number;
  items: AnalyticsItem[];
  shippingPaise?: number;
  taxPaise?: number;
}): boolean {
  const key = `${PURCHASE_KEY_PREFIX}${params.orderNumber}`;

  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch {
    // Private-mode or storage-disabled browsers throw. Losing the dedupe is
    // better than losing the conversion, so fall through and send.
  }

  track("purchase", {
    transaction_id: params.orderNumber,
    currency: CURRENCY,
    value: paiseToRupees(params.totalPaise),
    ...(params.shippingPaise !== undefined
      ? { shipping: paiseToRupees(params.shippingPaise) }
      : {}),
    ...(params.taxPaise !== undefined
      ? { tax: paiseToRupees(params.taxPaise) }
      : {}),
    items: params.items.map(toGaItem),
  });

  return true;
}
