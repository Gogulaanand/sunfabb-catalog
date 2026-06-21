import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  CatalogTransitionProvider,
  useCatalogTransition,
} from "./CatalogTransitionContext";

describe("useCatalogTransition", () => {
  it("throws when used outside the provider", () => {
    expect(() => renderHook(() => useCatalogTransition())).toThrow(
      "useCatalogTransition must be used within a CatalogTransitionProvider"
    );
  });

  it("starts pending then settles after the transition callback runs", async () => {
    const { result } = renderHook(() => useCatalogTransition(), {
      wrapper: CatalogTransitionProvider,
    });

    expect(result.current.isPending).toBe(false);

    await act(async () => {
      result.current.startCatalogTransition(() => {});
    });

    expect(result.current.isPending).toBe(false);
  });
});
