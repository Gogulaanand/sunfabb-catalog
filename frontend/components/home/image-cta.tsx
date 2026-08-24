import Image from "next/image";
import { TrackedContentLink } from "@/components/analytics/tracked-content-link";
import { TrackedWhatsAppLink } from "@/components/analytics/tracked-whatsapp-link";

interface ImageCtaProps {
  whatsappHref?: string;
}

export function ImageCta({ whatsappHref }: ImageCtaProps) {
  return (
    <div className="relative isolate min-h-[36rem] overflow-hidden bg-home-graphite text-white md:min-h-[40.625rem]">
      <Image
        src="/images/home/stitch/final-room.jpg"
        alt="Beautiful bedroom setting with layered neutral textiles"
        fill
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: "50% 50%" }}
      />
      <div className="home-cta-scrim absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-[36rem] max-w-(--spacing-container-max) flex-col justify-center px-5 md:min-h-[40.625rem] md:px-(--spacing-margin-desktop)">
        <h2
          id="image-cta-title"
          className="max-w-2xl font-display text-4xl font-medium leading-[1.08] tracking-[-0.04em] sm:text-5xl md:text-[3.5rem]"
        >
          Find what works in your room.
        </h2>
        <div className="mt-10 flex flex-wrap items-center gap-4 md:gap-6">
          <TrackedContentLink
            href="/catalog"
            contentType="homepage_cta"
            contentId="final_browse_collections"
            linkLocation="guided_shopping"
            className="inline-flex min-h-12 items-center justify-center rounded-sm border border-white bg-white px-7 text-sm font-semibold text-home-graphite transition-colors hover:bg-home-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-home-graphite"
          >
            Browse all collections
          </TrackedContentLink>
          {whatsappHref ? (
            <TrackedWhatsAppLink
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              tracking={{ linkLocation: "home_guided_enquiry" }}
              className="inline-flex min-h-12 items-center justify-center rounded-sm border border-white bg-transparent px-7 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-home-graphite"
            >
              Ask us on WhatsApp
            </TrackedWhatsAppLink>
          ) : (
            <TrackedContentLink
              href="/contact"
              contentType="homepage_cta"
              contentId="guided_shopping_contact"
              linkLocation="guided_shopping"
              className="inline-flex min-h-12 items-center justify-center rounded-sm border border-white bg-transparent px-7 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-home-graphite"
            >
              Ask Sunfabb
            </TrackedContentLink>
          )}
        </div>
      </div>
    </div>
  );
}
