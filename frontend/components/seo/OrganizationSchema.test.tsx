import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import {
  buildOrganizationSchemas,
  OrganizationSchema,
} from "./OrganizationSchema";

describe("buildOrganizationSchemas", () => {
  it("returns @graph with Organization and WebSite nodes", () => {
    const data = buildOrganizationSchemas("https://example.com");
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@graph"]).toHaveLength(2);
    expect(data["@graph"][0]["@type"]).toBe("Organization");
    expect(data["@graph"][1]["@type"]).toBe("WebSite");
  });

  it("sets Organization name to Sunfabb", () => {
    const data = buildOrganizationSchemas("https://example.com");
    expect(data["@graph"][0].name).toBe("Sunfabb");
  });

  it("uses the provided siteUrl for @id and url fields", () => {
    const data = buildOrganizationSchemas("https://sunfabb.com");
    expect(data["@graph"][0]["@id"]).toBe("https://sunfabb.com/#organization");
    expect(data["@graph"][0].url).toBe("https://sunfabb.com");
    expect(data["@graph"][1].url).toBe("https://sunfabb.com");
  });

  it("links WebSite publisher to Organization via @id", () => {
    const data = buildOrganizationSchemas("https://sunfabb.com");
    const websiteNode = data["@graph"][1] as Record<string, unknown>;
    expect((websiteNode.publisher as Record<string, unknown>)["@id"]).toBe(
      "https://sunfabb.com/#organization",
    );
  });
});

describe("OrganizationSchema", () => {
  it("renders a script tag with type application/ld+json", () => {
    const { container } = render(<OrganizationSchema />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
  });

  it("renders valid JSON-LD that parses without error", () => {
    const { container } = render(<OrganizationSchema />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(() => JSON.parse(script!.textContent!)).not.toThrow();
  });
});
