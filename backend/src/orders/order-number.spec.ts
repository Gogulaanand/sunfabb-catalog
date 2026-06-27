import {
  financialYear,
  formatOrderNumber,
  nextOrderNumber,
} from './order-number.js';

describe('order-number', () => {
  describe('financialYear', () => {
    it('returns the calendar year for April–December (FY start year)', () => {
      expect(financialYear(new Date('2026-04-01T00:00:00Z'))).toBe(2026);
      expect(financialYear(new Date('2026-06-27T10:00:00Z'))).toBe(2026);
      expect(financialYear(new Date('2026-12-31T23:00:00Z'))).toBe(2026);
    });

    it('returns the previous year for January–March (prior FY)', () => {
      expect(financialYear(new Date('2026-03-31T23:00:00Z'))).toBe(2025);
      expect(financialYear(new Date('2026-01-10T00:00:00Z'))).toBe(2025);
    });
  });

  describe('formatOrderNumber', () => {
    it('zero-pads the sequence to 6 digits', () => {
      expect(formatOrderNumber(2026, 1)).toBe('SF-2026-000001');
      expect(formatOrderNumber(2026, 123)).toBe('SF-2026-000123');
    });
  });

  describe('nextOrderNumber', () => {
    it('is the existing FY count + 1, formatted', () => {
      expect(nextOrderNumber(new Date('2026-06-27T00:00:00Z'), 0)).toBe(
        'SF-2026-000001',
      );
      expect(nextOrderNumber(new Date('2026-06-27T00:00:00Z'), 122)).toBe(
        'SF-2026-000123',
      );
    });
  });
});
