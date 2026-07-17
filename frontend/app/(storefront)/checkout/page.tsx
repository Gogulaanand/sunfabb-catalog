import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getQuote,
  listAddresses,
  CustomerApiError,
  type Quote,
  type Address,
} from "@/lib/customer-api";
import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

function errorMessage(body: unknown): string {
  if (typeof body === "object" && body && "message" in body) {
    return String((body as { message: unknown }).message);
  }
  return "We couldn't prepare your checkout.";
}

export default async function CheckoutPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("customer_token")?.value;

  // Logged-in only — bounce guests to login and return them here afterwards.
  if (!token) {
    redirect("/account/login?next=/checkout");
  }

  let quote: Quote;
  let addresses: Address[];
  try {
    [quote, addresses] = await Promise.all([getQuote(), listAddresses()]);
  } catch (err) {
    if (err instanceof CustomerApiError) {
      // Stale/invalid session → re-auth and come back.
      if (err.status === 401) {
        redirect("/account/login?next=/checkout");
      }
      // Empty cart / inactive or out-of-stock variant → 400. Show a recoverable
      // message rather than an order form for a cart that can't be checked out.
      return (
        <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-16 text-center">
          <h1 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-4">
            Checkout
          </h1>
          <p className="text-body-md text-on-surface-variant mb-8">
            {errorMessage(err.body)}
          </p>
          <Link
            href="/cart"
            className="inline-block bg-primary text-on-primary text-label-caps px-8 py-3 rounded hover:opacity-90 transition-opacity"
          >
            Back to Cart
          </Link>
        </div>
      );
    }
    throw err;
  }

  return <CheckoutClient quote={quote} addresses={addresses} />;
}
