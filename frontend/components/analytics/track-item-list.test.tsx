import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const trackViewItemList = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ trackViewItemList }));

const { TrackItemList } = await import("./track-item-list");

const items = [
  { item_id: "cuid-1", item_name: "Royal Bedspread", price_paise: 125000 },
];

beforeEach(() => {
  trackViewItemList.mockClear();
});

describe("TrackItemList", () => {
  it("reports the list once on mount and renders nothing", () => {
    const { container } = render(
      <TrackItemList items={items} listName="Catalog" listKey="all-1" />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(trackViewItemList).toHaveBeenCalledTimes(1);
    expect(trackViewItemList).toHaveBeenCalledWith(items, "Catalog", undefined);
  });

  it("passes the list id through when given", () => {
    render(
      <TrackItemList
        items={items}
        listName="Catalog"
        listId="towels-1"
        listKey="towels-1"
      />,
    );

    expect(trackViewItemList).toHaveBeenCalledWith(
      items,
      "Catalog",
      "towels-1",
    );
  });

  // The point of listKey: a re-render caused by something other than a new
  // result set must not inflate view_item_list.
  it("does not re-fire when re-rendered with the same listKey", () => {
    const { rerender } = render(
      <TrackItemList items={items} listName="Catalog" listKey="all-1" />,
    );
    rerender(
      <TrackItemList items={[...items]} listName="Catalog" listKey="all-1" />,
    );

    expect(trackViewItemList).toHaveBeenCalledTimes(1);
  });

  it("re-fires when the listKey changes", () => {
    const { rerender } = render(
      <TrackItemList items={items} listName="Catalog" listKey="all-1" />,
    );
    rerender(
      <TrackItemList items={items} listName="Catalog" listKey="towels-1" />,
    );

    expect(trackViewItemList).toHaveBeenCalledTimes(2);
  });
});
