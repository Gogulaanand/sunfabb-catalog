import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "@/components/ui/provider";
import { AdminNav } from "./admin-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/orders",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("AdminNav", () => {
  it("includes the Orders link", () => {
    render(
      <Provider>
        <AdminNav />
      </Provider>,
    );

    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute(
      "href",
      "/admin/orders",
    );
  });
});
