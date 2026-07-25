import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { buildFaqSchemaData, FaqSchema } from "./FaqSchema";

const entries = [
  {
    question: "What GSM is best for everyday bath towels?",
    answer: "450-600 GSM suits most Indian homes.",
  },
  {
    question: "Do you ship across India?",
    answer: "Yes, all orders ship within India.",
  },
];

describe("buildFaqSchemaData", () => {
  it("sets @type to FAQPage", () => {
    expect(buildFaqSchemaData(entries)["@type"]).toBe("FAQPage");
  });

  it("maps every entry to a Question with an acceptedAnswer", () => {
    const data = buildFaqSchemaData(entries);
    expect(data.mainEntity).toHaveLength(2);
    expect(data.mainEntity[0]["@type"]).toBe("Question");
    expect(data.mainEntity[0].name).toBe(
      "What GSM is best for everyday bath towels?",
    );
    expect(data.mainEntity[0].acceptedAnswer["@type"]).toBe("Answer");
    expect(data.mainEntity[0].acceptedAnswer.text).toBe(
      "450-600 GSM suits most Indian homes.",
    );
  });

  it("produces an empty mainEntity for no entries", () => {
    expect(buildFaqSchemaData([]).mainEntity).toEqual([]);
  });
});

describe("FaqSchema", () => {
  it("renders parseable JSON-LD", () => {
    const { container } = render(<FaqSchema entries={entries} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const parsed = JSON.parse(script!.textContent!);
    expect(parsed.mainEntity).toHaveLength(2);
  });

  it("escapes characters that could break out of the script tag", () => {
    const { container } = render(
      <FaqSchema
        entries={[
          { question: "</script><img onerror=x>", answer: "Cotton & linen." },
        ]}
      />,
    );
    const raw = container.querySelector("script")!.innerHTML;
    expect(raw).not.toContain("</script>");
    expect(raw).toContain("\\u0026");
  });
});
