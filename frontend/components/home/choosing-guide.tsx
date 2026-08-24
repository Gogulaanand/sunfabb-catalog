import Image from "next/image";
import { TrackedContentLink } from "@/components/analytics/tracked-content-link";
import { TrackedWhatsAppLink } from "@/components/analytics/tracked-whatsapp-link";

const CHOOSING_STEPS = [
  {
    href: "/catalog",
    contentId: "guide_start_with_room",
    title: "Start with the room",
  },
  {
    href: "/guides/towel-gsm-explained",
    contentId: "guide_choose_the_feel",
    title: "Choose the feel",
  },
  {
    href: "/guides/bedspread-size-guide-india",
    contentId: "guide_check_the_size",
    title: "Check the size",
  },
] as const;

interface ChoosingGuideProps {
  whatsappHref?: string;
}

export function ChoosingGuide({ whatsappHref }: ChoosingGuideProps) {
  return (
    <div className="grid gap-10 lg:min-h-[37rem] lg:grid-cols-[55%_45%] lg:items-stretch lg:gap-16">
      <div className="relative min-h-[26rem] overflow-hidden rounded-sm bg-home-stone lg:min-h-0">
        <Image
          src="/images/home/stitch/choosing-sunfabb-v2.jpg"
          alt="A hand feeling the texture of a bedspread"
          fill
          sizes="(max-width: 1023px) 100vw, 55vw"
          className="object-cover"
          style={{ objectPosition: "50% 50%" }}
        />
      </div>

      <div className="flex flex-col justify-center">
        <h2
          id="choosing-guide-title"
          className="mb-8 max-w-lg font-display text-3xl font-medium leading-[1.1] tracking-[-0.04em] text-home-graphite sm:text-4xl md:mb-12 md:text-5xl"
        >
          Not sure where to start?
        </h2>

        <div className="border-t border-home-graphite/20">
          {CHOOSING_STEPS.map((step) => (
            <TrackedContentLink
              key={step.contentId}
              href={step.href}
              contentType="homepage_support"
              contentId={step.contentId}
              linkLocation="choosing_guide"
              className="group flex min-h-20 items-center border-b border-home-graphite/20 py-5 font-display text-xl font-medium tracking-[-0.025em] text-home-graphite transition-colors hover:text-home-graphite/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-graphite focus-visible:ring-inset md:min-h-24 md:text-2xl"
            >
              {step.title}
            </TrackedContentLink>
          ))}

          <div className="flex min-h-24 flex-col items-start justify-between gap-4 border-b border-home-graphite/20 py-5 sm:flex-row sm:items-center">
            <span className="font-display text-xl font-medium tracking-[-0.025em] text-home-graphite md:text-2xl">
              Ask Sunfabb
            </span>
            {whatsappHref ? (
              <TrackedWhatsAppLink
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                tracking={{ linkLocation: "home_guided_enquiry" }}
                className="font-label inline-flex min-h-10 items-center rounded-sm border border-home-graphite bg-home-graphite px-5 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-home-walnut focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-graphite focus-visible:ring-offset-2"
              >
                Ask on WhatsApp
              </TrackedWhatsAppLink>
            ) : (
              <TrackedContentLink
                href="/contact"
                contentType="homepage_cta"
                contentId="guided_shopping_contact"
                linkLocation="choosing_guide"
                className="font-label inline-flex min-h-10 items-center rounded-sm border border-home-graphite bg-home-graphite px-5 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-home-walnut focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-graphite focus-visible:ring-offset-2"
              >
                Ask Sunfabb
              </TrackedContentLink>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
