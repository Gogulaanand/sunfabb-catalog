import Image from "next/image";
import { TrackedContentLink } from "@/components/analytics/tracked-content-link";

const FEATURED_COLLECTION = {
  href: "/catalog?category=bedspreads",
  contentId: "collection_bedspreads",
  title: "Bedspreads",
};

const COLLECTIONS = [
  {
    href: "/catalog?category=towels",
    contentId: "collection_towels",
    title: "Towels",
    image: "/images/home/stitch/collection-towels-sunfabb-v2.jpg",
    alt: "Folded towels in a sunlit room",
    position: "50% 50%",
  },
  {
    href: "/catalog?category=table-linen",
    contentId: "collection_table_linen",
    title: "Table linen",
    image: "/images/home/stitch/collection-table-linen-sunfabb-v2.jpg",
    alt: "Table linen laid across a wooden dining table",
    position: "50% 50%",
  },
  {
    href: "/catalog?category=table-linen",
    contentId: "collection_napkins",
    title: "Napkins",
    image: "/images/home/stitch/collection-napkins-sunfabb-v2.jpg",
    alt: "Folded napkins arranged with home textiles",
    position: "50% 50%",
  },
] as const;

const focusClasses =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-home-walnut";

export function CollectionBrowser() {
  return (
    <div className="text-white">
      <h2
        id="collection-browser-title"
        className="mb-10 font-display text-3xl font-medium tracking-[-0.04em] sm:text-4xl md:mb-12 md:text-5xl"
      >
        Shop the room
      </h2>

      <TrackedContentLink
        href={FEATURED_COLLECTION.href}
        contentType="homepage_cta"
        contentId={FEATURED_COLLECTION.contentId}
        linkLocation="collection_browser"
        className={`home-collection-card home-collection-feature group relative mb-4 block overflow-hidden rounded-sm md:mb-6 ${focusClasses}`}
      >
        <Image
          src="/images/home/stitch/collection-bedspreads-sunfabb-v2.jpg"
          alt="Patterned bedspread in a sunlit bedroom"
          fill
          sizes="(max-width: 767px) 100vw, 80vw"
          className="object-cover"
          style={{ objectPosition: "50% 50%" }}
        />
        <span className="relative z-10 flex min-h-[24rem] flex-col justify-end p-6 md:min-h-[28.5rem] md:p-8">
          <span className="font-display text-3xl font-medium tracking-[-0.03em] sm:text-4xl">
            {FEATURED_COLLECTION.title}
          </span>
        </span>
      </TrackedContentLink>

      <div className="grid gap-4 sm:grid-cols-3 md:gap-6">
        {COLLECTIONS.map((collection) => (
          <TrackedContentLink
            key={collection.contentId}
            href={collection.href}
            contentType="homepage_cta"
            contentId={collection.contentId}
            linkLocation="collection_browser"
            className={`home-collection-card group relative overflow-hidden rounded-sm ${focusClasses}`}
          >
            <Image
              src={collection.image}
              alt={collection.alt}
              fill
              sizes="(max-width: 639px) 100vw, 33vw"
              className="object-cover"
              style={{ objectPosition: collection.position }}
            />
            <span className="relative z-10 flex min-h-64 flex-col justify-end p-5 md:min-h-[15rem] md:p-6">
              <span className="font-display text-2xl font-medium tracking-[-0.025em]">
                {collection.title}
              </span>
            </span>
          </TrackedContentLink>
        ))}
      </div>
    </div>
  );
}
