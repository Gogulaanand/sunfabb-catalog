import { listCategories } from "@/lib/admin-api";
import { CategoriesClient } from "./categories-client";

export default async function AdminCategoriesPage() {
  const categories = await listCategories();
  return <CategoriesClient categories={categories} />;
}
