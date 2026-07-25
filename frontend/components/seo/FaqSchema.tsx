import { safeJsonLd } from "@/lib/json-ld";

export interface FaqEntry {
  question: string;
  /** Plain-text answer. Google reads the text, not markup. */
  answer: string;
}

interface FaqSchemaProps {
  entries: FaqEntry[];
}

export function buildFaqSchemaData(entries: FaqEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };
}

export function FaqSchema({ entries }: FaqSchemaProps) {
  const data = buildFaqSchemaData(entries);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
