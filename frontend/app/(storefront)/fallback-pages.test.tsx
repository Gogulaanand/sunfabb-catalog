import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";
import StorefrontError from "./error";

vi.mock("@/components/motion", () => ({
  Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("storefront fallback pages", () => {
  it("helps visitors recover from a missing page", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { name: /page has wandered off/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /browse catalog/i }),
    ).toHaveAttribute("href", "/catalog");
    expect(
      screen.getByRole("link", { name: /return home/i }),
    ).toHaveAttribute("href", "/");
  });

  it("offers retry, catalog, and home recovery actions after an error", () => {
    const reset = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(<StorefrontError error={new Error("test")} reset={reset} />);

    expect(
      screen.getByRole("heading", { name: /we.ll find our way back/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /browse catalog/i }),
    ).toHaveAttribute("href", "/catalog");
    expect(
      screen.getByRole("link", { name: /return home/i }),
    ).toHaveAttribute("href", "/");

    consoleError.mockRestore();
  });
});
