import Image from "next/image";
import { TrackedContentLink } from "@/components/analytics/tracked-content-link";
import { TrackedWhatsAppLink } from "@/components/analytics/tracked-whatsapp-link";
import {
  buildCapabilityEnquiryMessage,
  whatsappLink,
} from "@/lib/site-config";

const tableLinenEnquiryHref = whatsappLink(
  buildCapabilityEnquiryMessage("Table linen"),
);

const enquiryClassName =
  "mt-10 inline-flex min-h-12 w-fit items-center rounded-sm border border-home-graphite bg-home-graphite px-7 text-sm font-semibold text-white transition-colors hover:bg-home-walnut focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-graphite focus-visible:ring-offset-2";

export function TableLinenSplit() {
  return (
    <div className="grid items-stretch bg-home-stone md:min-h-[53.125rem] md:grid-cols-[60%_40%]">
      <div className="relative min-h-80 md:min-h-[53.125rem]">
        <Image
          src="/images/home/stitch/table-linen-setting-sunfabb-v2.jpg"
          alt="Table runner and napkins arranged for a shared meal"
          fill
          sizes="(max-width: 767px) 100vw, 55vw"
          className="object-cover"
          style={{ objectPosition: "50% 50%" }}
        />
      </div>
      <div className="flex flex-col justify-center bg-home-paper px-6 py-14 sm:px-10 md:px-12 lg:px-16">
        <p className="font-label mb-6 text-xs font-bold uppercase tracking-[0.16em] text-home-graphite/60">
          Table linen
        </p>
        <h2
          id="table-linen-title"
          className="max-w-md font-display text-3xl font-medium leading-[1.1] tracking-[-0.04em] text-home-graphite sm:text-4xl md:text-5xl"
        >
          For weekday meals and people coming over.
        </h2>
        <p className="mt-7 max-w-sm text-[1.0625rem] leading-7 text-home-graphite/80">
          Choose runners and napkins by table size, weave and colour.
        </p>
        <div className="mt-8 flex gap-4" aria-hidden="true">
          <span className="h-12 w-12 rounded-full border border-home-stone bg-[#e5e0d8] shadow-sm" />
          <span className="h-12 w-12 rounded-full border border-home-stone bg-[#c2b5a8] shadow-sm" />
        </div>
        {tableLinenEnquiryHref ? (
          <TrackedWhatsAppLink
            href={tableLinenEnquiryHref}
            target="_blank"
            rel="noopener noreferrer"
            tracking={{ linkLocation: "home_guided_enquiry" }}
            aria-label="Enquire about table linen"
            className={enquiryClassName}
          >
            Enquire about table linen
          </TrackedWhatsAppLink>
        ) : (
          <TrackedContentLink
            href="/contact"
            contentType="homepage_cta"
            contentId="table_linen_enquiry"
            linkLocation="table_linen_split"
            aria-label="Enquire about table linen"
            className={enquiryClassName}
          >
            Enquire about table linen
          </TrackedContentLink>
        )}
      </div>
    </div>
  );
}
