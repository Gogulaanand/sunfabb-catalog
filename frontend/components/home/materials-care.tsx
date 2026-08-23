import Image from "next/image";
import { TrackedContentLink } from "@/components/analytics/tracked-content-link";

const STORIES = [
  {
    title: "Materials",
    body: "Understand the difference between percale, sateen, and linen to find the perfect feel for your home.",
    image: "/images/home/stitch/material-weave.jpg",
    alt: "Macro view of a natural cotton weave",
    href: "/guides",
    contentId: "materials_explore",
    linkLabel: "Explore materials",
  },
  {
    title: "Care",
    body: "Simple routines to keep your textiles looking and feeling their best wash after wash.",
    image: "/images/home/stitch/care-folded.jpg",
    alt: "Carefully folded home textile",
    href: "/guides/how-to-wash-cotton-bedspreads",
    contentId: "care_guide",
    linkLabel: "Read care guide",
  },
] as const;

export function MaterialsCare() {
  return (
    <div
      id="materials-care-title"
      className="grid gap-10 md:grid-cols-2 md:gap-12"
      aria-label="Materials and care"
    >
      {STORIES.map((story) => (
        <article key={story.title}>
          <div className="relative mb-7 aspect-[4/3] overflow-hidden rounded-sm bg-home-stone md:h-[26rem] md:aspect-auto">
            <Image
              src={story.image}
              alt={story.alt}
              fill
              sizes="(max-width: 767px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <h2 className="font-display text-3xl font-medium tracking-[-0.03em] text-home-graphite">
            {story.title}
          </h2>
          <p className="mt-4 max-w-md text-[1.0625rem] leading-7 text-home-graphite/80">
            {story.body}
          </p>
          <TrackedContentLink
            href={story.href}
            contentType="homepage_support"
            contentId={story.contentId}
            linkLocation="materials_care"
            className="font-label mt-6 inline-flex w-fit border-b border-home-graphite pb-1 text-xs font-bold uppercase tracking-[0.16em] text-home-graphite transition-colors hover:text-home-graphite/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-graphite focus-visible:ring-offset-2"
          >
            {story.linkLabel}
          </TrackedContentLink>
        </article>
      ))}
    </div>
  );
}
