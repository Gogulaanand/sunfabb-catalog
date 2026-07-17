import { describe, expect, it } from "vitest";
import { safeJsonLd } from "./json-ld";

describe("safeJsonLd", () => {
  it("produces valid JSON that round-trips correctly", () => {
    const data = { name: "Sunfabb", price: "1250.00" };
    const result = safeJsonLd(data);
    expect(JSON.parse(result)).toEqual(data);
  });

  it("escapes < to prevent script-tag breakout", () => {
    const data = { name: "</script><img onerror=alert(1)>" };
    const result = safeJsonLd(data);
    expect(result).not.toContain("</script>");
    expect(result).toContain("\\u003c");
    expect(result).toContain("\\u003e");
  });

  it("escapes & to prevent entity injection", () => {
    const data = { name: "Towels & Linen" };
    const result = safeJsonLd(data);
    expect(result).not.toContain("&");
    expect(result).toContain("\\u0026");
  });

  it("round-trips unicode-escaped characters correctly", () => {
    const data = { name: "A < B & C > D" };
    const parsed = JSON.parse(safeJsonLd(data));
    expect(parsed.name).toBe("A < B & C > D");
  });
});
