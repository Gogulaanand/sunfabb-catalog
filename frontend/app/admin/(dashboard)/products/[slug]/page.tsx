import { notFound } from "next/navigation";
import { AdminApiError, getAdminProduct, listCategories, listColors, listMaterials } from "@/lib/admin-api";
import { ProductDetailClient } from "./product-detail-client";

export default async function AdminProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let product;
  try {
    product = await getAdminProduct(slug);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) notFound();
    throw err;
  }

  const [categories, materials, colors] = await Promise.all([listCategories(), listMaterials(), listColors()]);

  return <ProductDetailClient product={product} categories={categories} materials={materials} colors={colors} />;
}
