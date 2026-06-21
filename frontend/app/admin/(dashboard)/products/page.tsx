import { getAdminProducts, listCategories } from "@/lib/admin-api";
import { ProductsClient } from "./products-client";

export default async function AdminProductsPage() {
  const [{ items }, categories] = await Promise.all([getAdminProducts(), listCategories()]);
  return <ProductsClient products={items} categories={categories} />;
}
