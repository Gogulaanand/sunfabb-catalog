import Link from "next/link";
import Image from "next/image";
import { getCategories } from "@/lib/api";

export default async function HomePage() {
  let categories = await getCategories().catch(() => []);

  return (
    <>
      {/* Hero */}
      <section className="bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-zinc-900 mb-4">
            Crafted for every home
          </h1>
          <p className="text-lg text-zinc-600 max-w-xl mx-auto mb-8">
            Premium bedspreads, towels, napkins and table linen — made in India, built to last.
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center h-11 px-8 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            Shop the catalog
          </Link>
        </div>
      </section>

      {/* Featured categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 mb-8">
          Shop by category
        </h2>

        {categories.length === 0 ? (
          <p className="text-zinc-500">No categories found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/catalog?category=${category.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 hover:border-zinc-400 transition-colors"
              >
                {category.image_url ? (
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={category.image_url}
                      alt={category.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-zinc-100 flex items-center justify-center">
                    <span className="text-zinc-400 text-4xl">🪡</span>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-semibold text-zinc-900 group-hover:text-zinc-700 transition-colors">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
