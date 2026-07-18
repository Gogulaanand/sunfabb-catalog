import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "@/components/ui/provider";
import type { AdminOrderDetail } from "@/lib/admin-api";
import { OrderDetailClient } from "./order-detail-client";

vi.mock("server-only", () => ({}));

const updateStatusAction = vi.fn();
vi.mock("./actions", () => ({
  updateAdminOrderStatusAction: (...args: unknown[]) => updateStatusAction(...args),
}));

const detail: AdminOrderDetail = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  order_number: "SF-2026-000123",
  customer_id: "660e8400-e29b-41d4-a716-446655440000",
  status: "PAID",
  email: "jane@example.com",
  subtotal_paise: 10000,
  shipping_paise: 0,
  tax_paise: 0,
  discount_paise: 0,
  total_paise: 10000,
  currency: "INR",
  shipping_address: {
    full_name: "Jane Doe",
    phone: "9876543210",
    line1: "12 MG Road",
    line2: null,
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    country: "India",
  },
  billing_address: null,
  razorpay_order_id: "order_rzp_1",
  razorpay_payment_id: "pay_1",
  invoice_number: null,
  placed_at: "2026-07-18T08:35:00.000Z",
  created_at: "2026-07-18T08:30:00.000Z",
  updated_at: "2026-07-18T08:35:00.000Z",
  customer: { full_name: "Jane Doe", email: "jane@example.com", phone: "9876543210" },
  items: [
    {
      id: "770e8400-e29b-41d4-a716-446655440000",
      variant_id: "880e8400-e29b-41d4-a716-446655440000",
      product_name: "Royal Bedspread",
      variant_label: "King · Indigo · 100% Cotton",
      sku: "SKU-1",
      hsn_code: "6304",
      unit_price_paise: 5000,
      quantity: 2,
      tax_rate_bps: 0,
      cgst_paise: 0,
      sgst_paise: 0,
      igst_paise: 0,
      line_total_paise: 10000,
    },
  ],
  payments: [
    {
      id: "990e8400-e29b-41d4-a716-446655440000",
      razorpay_payment_id: "pay_1",
      razorpay_order_id: "order_rzp_1",
      amount_paise: 10000,
      status: "CAPTURED",
      method: "upi",
      refunded_paise: 0,
      created_at: "2026-07-18T08:35:00.000Z",
      updated_at: "2026-07-18T08:35:00.000Z",
    },
  ],
  shipment: null,
  allowed_next_statuses: ["PROCESSING", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"],
};

function renderClient() {
  return render(
    <Provider>
      <OrderDetailClient initialOrder={detail} />
    </Provider>,
  );
}

describe("OrderDetailClient", () => {
  beforeEach(() => {
    updateStatusAction.mockReset();
  });

  it("shows only server-provided legal next states and order details", () => {
    renderClient();

    expect(screen.getByText("SF-2026-000123")).toBeInTheDocument();
    expect(screen.getByText("Royal Bedspread")).toBeInTheDocument();
    expect(screen.getAllByText("₹100.00").length).toBeGreaterThan(0);
    expect(screen.getByText((_, element) => element?.textContent === "Razorpay payment: pay_1")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Processing" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Cancelled" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Delivered" })).not.toBeInTheDocument();
  });

  it("optimistically updates the selected status and replaces it with the server response", async () => {
    let resolveAction: (value: { ok: true; data: AdminOrderDetail }) => void = () => undefined;
    updateStatusAction.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve as typeof resolveAction;
      }),
    );
    const user = userEvent.setup();
    renderClient();

    await user.selectOptions(screen.getByLabelText("Update status"), "PROCESSING");
    await user.click(screen.getByRole("button", { name: "Confirm status update" }));
    expect(screen.getByLabelText("Update status")).toHaveValue("PROCESSING");

    const updated: AdminOrderDetail = {
      ...detail,
      status: "PROCESSING",
      allowed_next_statuses: ["SHIPPED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"],
    };
    resolveAction({ ok: true, data: updated });

    await waitFor(() => expect(updateStatusAction).toHaveBeenCalledWith(detail.id, "PROCESSING"));
    await waitFor(() => expect(screen.getByRole("option", { name: "Shipped" })).toBeInTheDocument());
  });

  it("rolls back the optimistic status and shows the server error", async () => {
    updateStatusAction.mockResolvedValue({ ok: false, error: "Invalid order status transition" });
    const user = userEvent.setup();
    renderClient();

    await user.selectOptions(screen.getByLabelText("Update status"), "PROCESSING");
    await user.click(screen.getByRole("button", { name: "Confirm status update" }));

    await waitFor(() => expect(screen.getByText("Invalid order status transition")).toBeInTheDocument());
    expect(screen.getByLabelText("Update status")).toHaveValue("");
  });

  it("rolls back and clears submitting state when the status action rejects", async () => {
    updateStatusAction.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderClient();

    await user.selectOptions(screen.getByLabelText("Update status"), "PROCESSING");
    await user.click(screen.getByRole("button", { name: "Confirm status update" }));

    await waitFor(() => expect(screen.getByText("Could not update order status")).toBeInTheDocument());
    expect(screen.getByLabelText("Update status")).toHaveValue("");
    expect(screen.getByLabelText("Update status")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Confirm status update" })).not.toHaveAttribute("data-loading");
  });
});
