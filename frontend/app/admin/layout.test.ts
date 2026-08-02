import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/provider", () => ({
  Provider: ({ children }: { children: unknown }) => children,
}));

import { metadata } from "./layout";

describe("AdminLayout metadata", () => {
  it("prevents admin routes from being indexed or followed", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
