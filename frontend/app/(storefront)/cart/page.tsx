import { cookies } from "next/headers";
import { getCart, CustomerApiError } from "@/lib/customer-api";
import CartPageLoggedIn from "./CartPageLoggedIn";
import CartPageGuest from "./CartPageGuest";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your Cart — Sunfabb" };

export default async function CartPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("customer_token")?.value;

  if (token) {
    let cart = null;
    try {
      cart = await getCart();
    } catch (err) {
      if (!(err instanceof CustomerApiError && err.status === 401)) {
        console.error("Failed to load server cart:", err);
      }
    }
    if (cart) return <CartPageLoggedIn initialCart={cart} />;
  }

  return <CartPageGuest />;
}
