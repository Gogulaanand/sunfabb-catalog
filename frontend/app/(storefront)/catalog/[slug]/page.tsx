import { notFound } from "next/navigation";
import Link from "next/link";
import { getProduct, getProducts, formatPrice, NotFoundError } from "@/lib/api";
import { ProductDetailInteractive } from "./ProductDetailInteractive";
import { CareDisclosure } from "./CareDisclosure";
import { getInitialVariantId } from "./product-gallery-utils";
import { ProductSchema } from "@/components/seo/ProductSchema";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { ProductCard } from "@/components/product/product-card";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";

export const revalidate = 30;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sunfabb.com";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const { items } = await getProducts({ limit: 100 }).catch(() => ({
    items: [],
    total: 0,
    page: 1,
    limit: 100,
  }));
  return items.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) return { title: "Product not found" };

  const primaryImage =
    product.images.find(
      (img) => img.is_primary && img.image_role === "GALLERY",
    ) ?? product.images.find((img) => img.image_role === "GALLERY");

  const ogImageUrl = primaryImage?.url.replace(
    "/upload/",
    "/upload/w_1200,h_630,c_fill,q_auto,f_auto/",
  );

  const description =
    product.description ??
    `Shop ${product.name} from Sunfabb's ${product.category.name} collection.`;

  return {
    title: product.name,
    description,
    alternates: {
      canonical: `${siteUrl}/catalog/${slug}`,
    },
    openGraph: {
      title: product.name,
      description,
      url: `/catalog/${slug}`,
      type: "website",
      ...(ogImageUrl && {
        images: [
          { url: ogImageUrl, width: 1200, height: 630, alt: product.name },
        ],
      }),
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let product;
  try {
    product = await getProduct(slug);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const initialVariantId = getInitialVariantId(product.variants, product.images);

  const related = (
    await getProducts({ categorySlug: product.category.slug, limit: 5 }).catch(
      () => ({
        items: [],
        total: 0,
        page: 1,
        limit: 5,
      }),
    )
  ).items
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

  const uniqueSizes = [...new Set(product.variants.map((v) => v.size))];
  const uniqueMaterials = [
    ...new Set(product.variants.map((v) => v.material.name)),
  ];
  const uniqueColors = [
    ...new Set(product.variants.map((v) => v.color.name)),
  ];

  return (
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-16">
      <ProductSchema product={product} siteUrl={siteUrl} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: `${siteUrl}/` },
          {
            name: product.category.name,
            url: `${siteUrl}/catalog?category=${product.category.slug}`,
          },
          { name: product.name },
        ]}
      />

      {/* Breadcrumb */}
      <nav className="text-body-sm text-on-surface-variant mb-8">
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/catalog?category=${product.category.slug}`}
          className="hover:text-primary transition-colors"
        >
          {product.category.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-on-surface">{product.name}</span>
      </nav>

      <ProductDetailInteractive
        images={product.images}
        variants={product.variants}
        productName={product.name}
        productSlug={product.slug}
        initialVariantId={initialVariantId}
        detailsBeforeVariant={
          <div className="space-y-4">
            <p className="text-label-caps text-primary tracking-widest">
              {product.category.name}
            </p>
            <h1 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface leading-tight">
              {product.name}
            </h1>
            {product.description && (
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                {product.description}
              </p>
            )}
          </div>
        }
        detailsAfterVariant={
          <div className="space-y-0">
            {/* Structured specs */}
            <div className="pt-6 border-t border-outline-variant">
              <h2 className="text-label-caps text-on-surface-variant tracking-widest mb-4">
                Product Details
              </h2>
              <dl className="divide-y divide-outline-variant/50">
                {uniqueSizes.length > 0 && (
                  <div className="flex gap-x-6 py-2.5 text-body-sm transition-colors hover:bg-surface-container/50 rounded px-1">
                    <dt className="text-on-surface-variant w-20 shrink-0">Sizes</dt>
                    <dd className="text-on-surface">{uniqueSizes.join(", ")}</dd>
                  </div>
                )}
                {uniqueMaterials.length > 0 && (
                  <div className="flex gap-x-6 py-2.5 text-body-sm transition-colors hover:bg-surface-container/50 rounded px-1">
                    <dt className="text-on-surface-variant w-20 shrink-0">Material</dt>
                    <dd className="text-on-surface">{uniqueMaterials.join(", ")}</dd>
                  </div>
                )}
                {uniqueColors.length > 0 && (
                  <div className="flex gap-x-6 py-2.5 text-body-sm transition-colors hover:bg-surface-container/50 rounded px-1">
                    <dt className="text-on-surface-variant w-20 shrink-0">Colours</dt>
                    <dd className="text-on-surface">{uniqueColors.join(", ")}</dd>
                  </div>
                )}
                <div className="grid grid-cols-[auto_1fr] gap-x-6 py-2.5 text-body-sm transition-colors hover:bg-surface-container/50 rounded px-1">
                  <dt className="text-on-surface-variant">Brand</dt>
                  <dd className="text-on-surface">Sunfabb</dd>
                </div>
              </dl>
            </div>

            {product.care_instructions && (
              <CareDisclosure instructions={product.care_instructions} />
            )}
          </div>
        }
      />

      {/* Complete the Look */}
      {related.length > 0 && (
        <div className="mt-(--spacing-margin-mobile) md:mt-24">
          <Reveal className="flex items-baseline justify-between mb-10">
            <h2 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface">
              Complete the Look
            </h2>
            <Link
              href={`/catalog?category=${product.category.slug}`}
              className="text-label-caps text-primary hover:underline whitespace-nowrap rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Shop All
            </Link>
          </Reveal>
          <StaggerGroup className="grid grid-cols-2 md:grid-cols-4 gap-(--spacing-gutter-mobile) md:gap-(--spacing-gutter-desktop)">
            {related.map((item) => {
              const galleryImages = item.images.filter(
                (img) => img.image_role === "GALLERY",
              );
              const itemImage =
                galleryImages.find((img) => img.is_primary) ?? galleryImages[0];
              const lowestPrice = item.variants.length
                ? Math.min(...item.variants.map((v) => v.price))
                : null;

              return (
                <StaggerItem key={item.id}>
                  <ProductCard
                    slug={item.slug}
                    name={item.name}
                    imageUrl={itemImage?.url}
                    imageAlt={itemImage?.alt_text ?? item.name}
                    formattedPrice={lowestPrice !== null ? formatPrice(lowestPrice) : null}
                    aspectRatio="3/4"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        </div>
      )}
    </div>
  );
}
