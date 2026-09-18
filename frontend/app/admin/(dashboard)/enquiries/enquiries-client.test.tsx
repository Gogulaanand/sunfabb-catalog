import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "@/components/ui/provider";
import type { AdminEnquiriesResponse } from "@/lib/admin-enquiries";
import { EnquiriesClient } from "./enquiries-client";
import AdminEnquiriesError from "./error";
import AdminEnquiriesLoading from "./loading";

const response: AdminEnquiriesResponse = {
  enquiries: [
    {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Jane Doe",
      phone: "+919876543210",
      email: "jane@example.com",
      message: "Please share the available king-size bedspreads.",
      created_at: "2026-09-12T08:30:00.000Z",
    },
  ],
  total: 21,
  page: 2,
  limit: 10,
};

function renderClient(data: AdminEnquiriesResponse = response) {
  return render(
    <Provider>
      <EnquiriesClient
        response={data}
        filters={{ page: 2, limit: 10 }}
      />
    </Provider>,
  );
}

describe("EnquiriesClient", () => {
  it("renders submitted fields and timestamp", () => {
    renderClient();

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("+919876543210")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Please share the available king-size bedspreads.")).toBeInTheDocument();
    expect(screen.getByText(/12 Sept 2026/)).toBeInTheDocument();
  });

  it("renders empty state and pagination links", () => {
    renderClient({ enquiries: [], total: 21, page: 2, limit: 10 });

    expect(screen.getByText("No contact enquiries have been submitted yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute(
      "href",
      "/admin/enquiries?page=1&limit=10",
    );
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute(
      "href",
      "/admin/enquiries?page=3&limit=10",
    );
  });

  it("renders route loading and retry states", () => {
    const reset = vi.fn();
    const { rerender } = render(
      <Provider>
        <AdminEnquiriesLoading />
      </Provider>,
    );
    expect(screen.getByLabelText("Loading enquiries")).toBeInTheDocument();

    rerender(
      <Provider>
        <AdminEnquiriesError reset={reset} />
      </Provider>,
    );
    expect(screen.getByText("Enquiries could not be loaded")).toBeInTheDocument();
    screen.getByRole("button", { name: "Try again" }).click();
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
