import type { FaqEntry } from "@/components/seo/FaqSchema";

export interface FaqSection {
  label: string;
  entries: FaqEntry[];
}

/**
 * Single source of truth for the FAQ. The page renders from this and the
 * FAQPage JSON-LD is built from the same array, so the structured data can
 * never describe questions the page does not actually show — a mismatch
 * Google treats as spam.
 *
 * Scope note: these are product, material and care questions only. Orders,
 * shipping, returns and payment questions are deliberately absent until the
 * owner supplies the underlying policy inputs (return window, shipping
 * coverage, legal entity) — publishing a guessed policy is worse than
 * publishing none. See docs/plans/growth-wave-1-trust-and-content.md §2.
 */
export const FAQ_SECTIONS: FaqSection[] = [
  {
    label: "Choosing",
    entries: [
      {
        question: "What GSM should I choose for a bath towel?",
        answer:
          "450-600 GSM suits most Indian homes. Stay at 400-550 GSM in humid coastal cities like Mumbai, Chennai and Kochi, where heavier towels struggle to dry between uses. Drier inland regions can comfortably take 550-700 GSM.",
      },
      {
        question: "Is a higher GSM towel always better?",
        answer:
          "No. Absorbency gains flatten out above roughly 700 GSM while drying time keeps climbing. A well-made 500 GSM towel in long-staple cotton feels better than a coarse 800 GSM one, because softness comes from fibre quality and finishing rather than density.",
      },
      {
        question: "What are your products made from?",
        answer:
          "Natural fibres, predominantly cotton, woven in India. Every product page lists the exact material for each variant, alongside its size, colour and price in Indian Rupees.",
      },
      {
        question: "Are the colours natural or dyed?",
        answer:
          "Dyed cotton. Some loose surface dye is normal on a new piece, which is why the first wash should be done separately in cold water.",
      },
    ],
  },
  {
    label: "Sizing",
    entries: [
      {
        question: "What size bedspread fits an Indian queen bed?",
        answer:
          "An Indian queen mattress is 60 x 78 inches. With a standard 10-14 inch drop that needs a bedspread of roughly 84 x 90 inches, so a 90 x 108 inch bedspread is the usual choice.",
      },
      {
        question: "Are Indian bed sizes the same as US or UK sizes?",
        answer:
          "No. An Indian king is 72 x 78 inches against a US king at 76 x 80 inches, and an Indian double is 48 x 72 inches against a US double at 54 x 75 inches. Sizing a bedspread against US measurements is the most common reason one arrives too small.",
      },
      {
        question: "How much overhang should a bedspread have?",
        answer:
          "10-14 inches of drop on each side for a standard look, 15-18 inches to cover the bed frame, and mattress-plus-frame height if you want it to reach the floor and hide a storage base.",
      },
      {
        question: "What size tablecloth do I need?",
        answer:
          "Add twice the drop to each table dimension. A 60 x 36 inch six-seater with a 10 inch drop needs about 80 x 56 inches. Use a 6-8 inch drop for everyday meals and 12-15 inches for formal settings.",
      },
      {
        question: "What is the standard dinner napkin size?",
        answer:
          "20 x 20 inches for a full meal, 16 x 16 inches for everyday and breakfast use, and 6 x 6 inches for cocktail napkins.",
      },
    ],
  },
  {
    label: "Care",
    entries: [
      {
        question: "How do I wash a cotton bedspread?",
        answer:
          "Cold or lukewarm water at 30°C maximum, on a gentle cycle with a mild pH-neutral detergent. No bleach and no fabric softener. Wash a new bedspread on its own the first time to shed loose dye, then line dry in shade.",
      },
      {
        question: "Will my bedspread shrink or fade?",
        answer:
          "Pre-shrunk cotton typically loses 2-3% on the first wash and very little after that. Fading is almost always caused by drying dyed cotton in direct sunlight or by detergents containing optical brighteners. Dry dyed pieces in shade, turned inside out.",
      },
      {
        question: "Why should I avoid fabric softener on towels?",
        answer:
          "Fabric softener leaves a waxy film that coats the pile and measurably reduces absorbency. Half a cup of white vinegar in the rinse softens the cotton without coating it.",
      },
      {
        question: "How do I keep towels feeling plush?",
        answer:
          "Use about half the detergent you would normally, skip softener, avoid over-drying on high heat, and shake each towel out sharply before hanging it. Towels feel thin because the pile has matted down, not because they have lost weight.",
      },
      {
        question: "How do I treat a stain on cotton?",
        answer:
          "Treat it before the piece goes through a normal wash, and never with hot water, which sets most stains permanently. Blot and flush from the reverse side rather than rubbing, since rubbing distorts the weave and leaves a shiny patch.",
      },
    ],
  },
];

export const FAQ_ENTRIES: FaqEntry[] = FAQ_SECTIONS.flatMap(
  (section) => section.entries,
);
