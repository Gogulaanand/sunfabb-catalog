"use client";

import { useState, type ReactNode } from "react";
import type { Category, Color, Material } from "@/lib/api";
import { TrackedContentLink } from "@/components/analytics/tracked-content-link";

type FacetKey = "room" | "material" | "colour";

interface ShoppingFacetAccordionProps {
  categories: Category[];
  materials: Material[];
  colors: Color[];
}

interface FacetPanelProps {
  facet: FacetKey;
  label: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function FacetPanel({
  facet,
  label,
  description,
  open,
  onToggle,
  children,
}: FacetPanelProps) {
  const triggerId = `shopping-facet-${facet}-trigger`;
  const panelId = `shopping-facet-${facet}-panel`;

  return (
    <div className="border-b border-home-graphite/20">
      <h3>
        <button
          id={triggerId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="group flex min-h-14 w-full items-center justify-between gap-6 py-3 text-left text-[1.0625rem] text-home-graphite transition-colors hover:text-home-graphite/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-graphite focus-visible:ring-inset"
        >
          <span>{label}</span>
          <span
            aria-hidden="true"
            className={`text-xl ${open ? "rotate-45" : "group-hover:rotate-90"}`}
          >
            +
          </span>
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!open}
        className="pb-5"
      >
        <p className="max-w-xl text-body-sm leading-6 text-home-graphite/75">
          {description}
        </p>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function FallbackLink({ facet }: { facet: FacetKey }) {
  return (
    <TrackedContentLink
      href="/catalog"
      contentType="homepage_cta"
      contentId={`shopping_facet_${facet}_fallback`}
      linkLocation="home_intro_chooser"
      data-analytics-id={`shopping-facet-${facet}-fallback`}
      className="font-label inline-flex min-h-10 items-center rounded-sm border border-home-graphite px-4 text-xs font-bold uppercase tracking-[0.14em] text-home-graphite transition-colors hover:bg-home-graphite hover:text-home-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-graphite focus-visible:ring-offset-2"
    >
      Browse the full catalog
    </TrackedContentLink>
  );
}

export function ShoppingFacetAccordion({
  categories,
  materials,
  colors,
}: ShoppingFacetAccordionProps) {
  const [openFacet, setOpenFacet] = useState<FacetKey | null>("room");

  function toggleFacet(facet: FacetKey) {
    setOpenFacet((current) => (current === facet ? null : facet));
  }

  return (
    <div className="mt-10 border-t border-home-graphite/20">
      <FacetPanel
        facet="room"
        label="Room"
        description="Start with the room you are styling to explore Sunfabb's everyday bedroom layers and considered table settings."
        open={openFacet === "room"}
        onToggle={() => toggleFacet("room")}
      >
        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {categories.map((category) => (
              <TrackedContentLink
                key={category.id}
                href={`/catalog?category=${encodeURIComponent(category.slug)}`}
                contentType="homepage_cta"
                contentId={`shopping_room_${category.id}`}
                linkLocation="home_intro_chooser"
                data-analytics-id={`shopping-facet-room-${category.id}`}
                className="font-label inline-flex min-h-9 items-center rounded-sm border-b border-home-graphite/35 px-1 text-xs font-bold uppercase tracking-[0.14em] text-home-graphite transition-colors hover:border-home-graphite hover:text-home-graphite/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-graphite focus-visible:ring-offset-2"
              >
                {category.name}
              </TrackedContentLink>
            ))}
          </div>
        ) : (
          <FallbackLink facet="room" />
        )}
      </FacetPanel>

      <FacetPanel
        facet="material"
        label="Material"
        description="Choose the natural hand-feel you want under your fingertips, with Sunfabb materials selected for daily comfort and lasting use."
        open={openFacet === "material"}
        onToggle={() => toggleFacet("material")}
      >
        {materials.length > 0 ? (
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {materials.map((material) => (
              <TrackedContentLink
                key={material.id}
                href={`/catalog?material=${encodeURIComponent(material.id)}`}
                contentType="homepage_cta"
                contentId={`shopping_material_${material.id}`}
                linkLocation="home_intro_chooser"
                data-analytics-id={`shopping-facet-material-${material.id}`}
                className="font-label inline-flex min-h-9 items-center rounded-sm border-b border-home-graphite/35 px-1 text-xs font-bold uppercase tracking-[0.14em] text-home-graphite transition-colors hover:border-home-graphite hover:text-home-graphite/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-graphite focus-visible:ring-offset-2"
              >
                {material.name}
              </TrackedContentLink>
            ))}
          </div>
        ) : (
          <FallbackLink facet="material" />
        )}
      </FacetPanel>

      <FacetPanel
        facet="colour"
        label="Colour"
        description="Follow the Sunfabb palette that feels like home, from quiet neutrals to rich accents woven for Indian light."
        open={openFacet === "colour"}
        onToggle={() => toggleFacet("colour")}
      >
        {colors.length > 0 ? (
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {colors.map((color) => (
              <TrackedContentLink
                key={color.id}
                href={`/catalog?color=${encodeURIComponent(color.id)}`}
                contentType="homepage_cta"
                contentId={`shopping_colour_${color.id}`}
                linkLocation="home_intro_chooser"
                data-analytics-id={`shopping-facet-colour-${color.id}`}
                className="font-label inline-flex min-h-9 items-center gap-2 rounded-sm px-1 text-xs font-bold uppercase tracking-[0.14em] text-home-graphite transition-colors hover:text-home-graphite/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-graphite focus-visible:ring-offset-2"
              >
                {color.hex_code ? (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 rounded-full border border-home-graphite/35"
                    style={{ backgroundColor: color.hex_code }}
                  />
                ) : null}
                <span>{color.name}</span>
              </TrackedContentLink>
            ))}
          </div>
        ) : (
          <FallbackLink facet="colour" />
        )}
      </FacetPanel>
    </div>
  );
}
