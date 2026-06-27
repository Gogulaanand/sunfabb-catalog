// Order-number scheme: SF-{FY}-{6-digit sequence} (D36 / C2). Order numbers are
// customer-facing and may have gaps (cancelled / abandoned orders) — unlike GST
// invoice numbers (6.5), which must be gap-free. Generated server-side, never
// trusted from the client.

// Indian financial year starts on 1 April. A date in Jan–Mar belongs to the FY
// that started the previous calendar year. The FY label is its start year, so
// 2026-06-27 → 2026 → "SF-2026-...". UTC is used for a deterministic boundary
// (the backend runs in UTC on Render); boundary edge cases are negligible at
// this scale (D14).
export function financialYear(date: Date): number {
  const month = date.getUTCMonth(); // 0 = January
  const year = date.getUTCFullYear();
  return month >= 3 ? year : year - 1; // April (index 3) onward = current year
}

export function formatOrderNumber(fy: number, sequence: number): string {
  return `SF-${fy}-${String(sequence).padStart(6, '0')}`;
}

// Derive the next order number from how many orders already exist for the FY.
// Called inside the order transaction; a concurrent collision on the unique
// order_number is caught and retried by the service (rare at this scale).
export function nextOrderNumber(
  date: Date,
  existingCountForFy: number,
): string {
  const fy = financialYear(date);
  return formatOrderNumber(fy, existingCountForFy + 1);
}
