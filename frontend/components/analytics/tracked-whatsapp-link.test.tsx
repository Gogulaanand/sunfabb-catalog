import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const trackWhatsAppClick = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ trackWhatsAppClick }));

const { TrackedWhatsAppLink } = await import("./tracked-whatsapp-link");

describe("TrackedWhatsAppLink", () => {
  it("records its conversion context when clicked", () => {
    render(
      <TrackedWhatsAppLink
        href="https://wa.me/917010735152"
        tracking={{
          linkLocation: "pdp",
          productId: "product-1",
          variantId: "variant-1",
        }}
      >
        Enquire on WhatsApp
      </TrackedWhatsAppLink>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Enquire on WhatsApp" }));

    expect(trackWhatsAppClick).toHaveBeenCalledWith({
      linkLocation: "pdp",
      productId: "product-1",
      variantId: "variant-1",
    });
  });
});
