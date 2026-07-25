"use client";

import { useEffect, useRef } from "react";
import { trackViewItemList, type AnalyticsItem } from "@/lib/analytics";

interface TrackItemListProps {
  items: AnalyticsItem[];
  listName: string;
  listId?: string;
  /**
   * Changing this re-fires the event. The catalog passes its filter/page key
   * so a new result set counts as a new list view, while a re-render caused by
   * something else does not.
   */
  listKey: string;
}

/**
 * Renders nothing; exists so a server-rendered grid can report `view_item_list`.
 */
export function TrackItemList({
  items,
  listName,
  listId,
  listKey,
}: TrackItemListProps) {
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (lastKey.current === listKey) return;
    lastKey.current = listKey;
    trackViewItemList(items, listName, listId);
  }, [items, listName, listId, listKey]);

  return null;
}
