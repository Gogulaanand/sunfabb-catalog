import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "@/components/ui/provider";
import type { AdminOrdersResponse } from "@/lib/admin-api";
import { OrdersClient } from "./orders-client";

const response: AdminOrdersResponse = {
  orders: [
    {
      id: "550e8400-e29b-41d4-a716-446655440000",
      order_number: "SF-2026-000123",
      status: "PAID",
      customer: { full_name: "Jane Doe", email: "jane@example.com" },
      total_paise: 125000,
      created_at: "2026-07-18T08:30:00.000Z",
      item_count: 2,
    },
  ],
  total: 21,
  page: 2,
  limit: 10,
};

function renderClient() {
  return render(
    <Provider>
      <OrdersClient
        response={response}
        filters={{ status: "PAID", date_from: "2026-07-01", date_to: "2026-07-18" }}
      />
    </Provider>,
  );
}

describe("OrdersClient", () => {
  it("renders order fields, a formatted INR total, and a colored status badge", () => {
    renderClient();

    expect(screen.getByText("SF-2026-000123")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("₹1,250.00")).toBeInTheDocument();
    expect(screen.getAllByText("Paid")).toHaveLength(2);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders filter controls with current values and pagination that preserves filters", () => {
    renderClient();

    expect(screen.getByLabelText("Status")).toHaveValue("PAID");
    expect(screen.getByLabelText("From date")).toHaveValue("2026-07-01");
    expect(screen.getByLabelText("To date")).toHaveValue("2026-07-18");
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute(
      "href",
      "/admin/orders?page=3&limit=10&status=PAID&date_from=2026-07-01&date_to=2026-07-18",
    );
    expect(screen.getByRole("link", { name: "SF-2026-000123" })).toHaveAttribute(
      "href",
      "/admin/orders/550e8400-e29b-41d4-a716-446655440000",
    );
  });
});
