import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getProduct } from "@/lib/api";
import VariantSelector from "./VariantSelector";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) return { title: "Product not found — Sunfabb" };
  return {
    title: `${product.name} — Sunfabb`,
    description: product.description ?? undefined,
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);

  if (!product) notFound();

  const sortedImages = [...product.images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.display_order - b.display_order;
  });

  const primaryImage = sortedImages[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-8">
        <Link href="/" className="hover:text-zinc-900 transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/catalog" className="hover:text-zinc-900 transition-colors">
          Catalog
        </Link>
        <span>/</span>
        <Link
          href={`/catalog?category=${product.category.slug}`}
          className="hover:text-zinc-900 transition-colors"
        >
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-zinc-900 font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Images */}
        <div className="space-y-4">
          {primaryImage ? (
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-100">
              <Image
                src={primaryImage.url}
                alt={primaryImage.alt_text ?? product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          ) : (
            <div className="aspect-square rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-300 text-7xl">
              🧵
            </div>
          )}

          {/* Thumbnail strip */}
          {sortedImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {sortedImages.map((img) => (
                <div
                  key={img.id}
                  className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200"
                >
                  <Image
                    src={img.url}
                    alt={img.alt_text ?? product.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-zinc-400 uppercase tracking-wider mb-1">
              {product.category.name}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              {product.name}
            </h1>
          </div>

          {/* Variant selector (client component) */}
          {product.variants.length > 0 ? (
            <VariantSelector variants={product.variants} />
          ) : (
            <p className="text-zinc-500 text-sm">No variants available.</p>
          )}

          {/* Description */}
          {product.description && (
            <div className="pt-4 border-t border-zinc-200">
              <h2 className="text-sm font-semibold text-zinc-700 mb-2">Description</h2>
              <p className="text-sm text-zinc-600 leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
