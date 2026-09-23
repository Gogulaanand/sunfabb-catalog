'use client';

import Image from "next/image";
import { motion } from "motion/react";
import { TrackedContentLink } from "@/components/analytics/tracked-content-link";
import { TrackedWhatsAppLink } from "@/components/analytics/tracked-whatsapp-link";
import {
  buildCapabilityEnquiryMessage,
  whatsappLink,
} from "@/lib/site-config";

const HERO_IMAGE = "/images/home/sunfabb-hero-option-e.png";

const HERO_CATEGORIES = [
  { kind: "catalog", label: "Bedspreads", href: "/catalog?category=bedspreads", id: "hero_category_bedspreads" },
  { kind: "capability", label: "Towels", capability: "Towels", id: "hero_category_towels" },
  { kind: "capability", label: "Table linen", capability: "Table linen", id: "hero_category_table_linen" },
  { kind: "capability", label: "Napkins", capability: "Napkins", id: "hero_category_napkins" },
] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

export function HeroSection() {
  return (
    <section className="home-hero relative isolate flex items-end overflow-hidden">
      <Image
        src={HERO_IMAGE}
        alt="Bedspread and folded home textiles in a sunlit room"
        fill
        priority
        loading="eager"
        sizes="100vw"
        className="object-cover"
      />

      <div className="home-hero-scrim absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-(--spacing-container-max) px-5 pb-14 sm:pb-28 md:px-(--spacing-margin-desktop) md:pb-32">
        <motion.h1
          className="mb-5 max-w-4xl font-display text-5xl font-medium leading-[1.04] tracking-[-0.045em] text-white sm:text-6xl lg:text-[4.5rem]"
          style={{
            textWrap: "balance",
          }}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          Textiles that make a room feel lived in.
        </motion.h1>

        <motion.p
          className="max-w-xl text-[1.0625rem] leading-7 text-white/90 md:text-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE, delay: 0.12 }}
        >
          Bedspreads, towels and table linen chosen for everyday homes.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.24 }}
        >
          <TrackedContentLink
            href="/catalog"
            contentType="homepage_cta"
            contentId="hero_explore_designs"
            linkLocation="hero"
            className="inline-flex min-h-12 items-center justify-center rounded bg-white px-8 text-xs font-bold uppercase tracking-[0.14em] text-home-graphite transition-colors hover:bg-home-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-home-graphite"
          >
            Browse collections
          </TrackedContentLink>
          <TrackedContentLink
            href="/catalog"
            contentType="homepage_cta"
            contentId="hero_new_arrivals"
            linkLocation="hero"
            className="rounded text-xs font-bold uppercase tracking-[0.16em] text-white/90 underline decoration-white/45 underline-offset-8 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#38271f]"
          >
            See new arrivals
          </TrackedContentLink>
        </motion.div>
      </div>

      <nav
        aria-label="Shop by category"
        className="absolute inset-x-0 bottom-0 z-20 hidden border-t border-white/20 bg-home-walnut/80 text-white backdrop-blur-sm sm:block"
      >
        <div className="mx-auto flex h-16 max-w-(--spacing-container-max) items-center gap-10 px-(--spacing-margin-desktop)">
          {HERO_CATEGORIES.map((category) => (
            category.kind === "catalog" ? (
              <TrackedContentLink
                key={category.id}
                href={category.href}
                contentType="homepage_cta"
                contentId={category.id}
                linkLocation="hero_category_ribbon"
                className="inline-flex items-center gap-3 rounded text-sm font-medium text-white/90 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {category.label}
                <span aria-hidden="true">→</span>
              </TrackedContentLink>
            ) : (
              <TrackedWhatsAppLink
                key={category.id}
                href={whatsappLink(
                  buildCapabilityEnquiryMessage(category.capability),
                ) ?? "/contact"}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Enquire about ${category.label}`}
                tracking={{ linkLocation: "home_guided_enquiry" }}
                className="inline-flex items-center gap-3 rounded text-sm font-medium text-white/90 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {category.label}
                <span className="text-[0.65rem] uppercase tracking-[0.12em] text-white/65">
                  Enquire
                </span>
                <span aria-hidden="true">→</span>
              </TrackedWhatsAppLink>
            )
          ))}
        </div>
      </nav>
    </section>
  );
}
