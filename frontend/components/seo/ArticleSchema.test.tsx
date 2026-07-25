import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { buildArticleSchemaData, ArticleSchema } from "./ArticleSchema";

const props = {
  headline: "Towel GSM explained",
  description: "What GSM means & how to choose.",
  datePublished: "2026-07-24",
  url: "https://sunfabb.com/guides/towel-gsm-explained",
};

describe("buildArticleSchemaData", () => {
  it("sets @type to Article", () => {
    expect(buildArticleSchemaData(props)["@type"]).toBe("Article");
  });

  it("carries the headline, description and publish date", () => {
    const data = buildArticleSchemaData(props);
    expect(data.headline).toBe("Towel GSM explained");
    expect(data.description).toBe("What GSM means & how to choose.");
    expect(data.datePublished).toBe("2026-07-24");
  });

  it("points mainEntityOfPage at the canonical URL", () => {
    const data = buildArticleSchemaData(props);
    expect(data.mainEntityOfPage["@id"]).toBe(
      "https://sunfabb.com/guides/towel-gsm-explained",
    );
  });
});

describe("ArticleSchema", () => {
  it("renders a script tag with type application/ld+json", () => {
    const { container } = render(<ArticleSchema {...props} />);
    expect(
      container.querySelector('script[type="application/ld+json"]'),
    ).toBeTruthy();
  });

  it("escapes characters that could break out of the script tag", () => {
    const { container } = render(
      <ArticleSchema {...props} headline={'</script><img onerror="x">'} />,
    );
    const raw = container.querySelector("script")!.innerHTML;
    expect(raw).not.toContain("</script>");
    expect(raw).toContain("\\u003c");
  });

  it("still parses as JSON after escaping", () => {
    const { container } = render(
      <ArticleSchema {...props} headline={"Towels < 400 GSM & drying"} />,
    );
    const parsed = JSON.parse(container.querySelector("script")!.textContent!);
    expect(parsed.headline).toBe("Towels < 400 GSM & drying");
  });
});
