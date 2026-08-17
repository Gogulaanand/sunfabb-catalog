import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const trackHomeSectionView = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ trackHomeSectionView }));

let callback: IntersectionObserverCallback;
const disconnect = vi.fn();
const observe = vi.fn();

beforeEach(() => {
  trackHomeSectionView.mockClear();
  disconnect.mockClear();
  observe.mockClear();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(nextCallback: IntersectionObserverCallback) {
        callback = nextCallback;
      }
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      takeRecords = vi.fn();
      root = null;
      rootMargin = "0px";
      thresholds = [0.35];
    },
  );
});

const { TrackedSection } = await import("./tracked-section");

describe("TrackedSection", () => {
  it("reports the section once when it becomes visible", () => {
    render(
      <TrackedSection sectionId="featured-designs" position={3}>
        <h2>Featured designs</h2>
      </TrackedSection>,
    );

    act(() => {
      callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
      callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });

    expect(trackHomeSectionView).toHaveBeenCalledTimes(1);
    expect(trackHomeSectionView).toHaveBeenCalledWith("featured-designs", 3);
  });
});
