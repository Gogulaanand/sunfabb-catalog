import { describe, expect, it } from "vitest";
import { parseAdminOrdersQuery } from "./admin-order-query";

describe("parseAdminOrdersQuery", () => {
  it("keeps valid pagination, status, and date filters", () => {
    expect(
      parseAdminOrdersQuery({
        page: "2",
        limit: "50",
        status: "PAID",
        date_from: "2026-07-01",
        date_to: "2026-07-18",
      }),
    ).toEqual({
      page: 2,
      limit: 50,
      status: "PAID",
      date_from: "2026-07-01",
      date_to: "2026-07-18",
    });
  });

  it("drops invalid values instead of sending them to the backend", () => {
    expect(
      parseAdminOrdersQuery({
        page: "0",
        limit: "101",
        status: "NOT_A_STATUS",
        date_from: "2026-02-30",
        date_to: "2026-07-18",
      }),
    ).toEqual({ date_to: "2026-07-18" });
  });

  it("drops an inverted date range", () => {
    expect(
      parseAdminOrdersQuery({ date_from: "2026-07-19", date_to: "2026-07-18" }),
    ).toEqual({});
  });
});
