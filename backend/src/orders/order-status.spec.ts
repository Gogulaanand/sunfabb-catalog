import { BadRequestException } from '@nestjs/common';
import { assertTransition, canTransition } from './order-status.js';

describe('order-status state machine', () => {
  describe('canTransition', () => {
    it('allows the happy fulfilment path', () => {
      expect(canTransition('PENDING_PAYMENT', 'PAID')).toBe(true);
      expect(canTransition('PAID', 'PROCESSING')).toBe(true);
      expect(canTransition('PROCESSING', 'SHIPPED')).toBe(true);
      expect(canTransition('SHIPPED', 'DELIVERED')).toBe(true);
    });

    it('allows payment failure and cancellation from PENDING_PAYMENT', () => {
      expect(canTransition('PENDING_PAYMENT', 'PAYMENT_FAILED')).toBe(true);
      expect(canTransition('PENDING_PAYMENT', 'CANCELLED')).toBe(true);
    });

    it('allows refunds from paid-onward states', () => {
      expect(canTransition('PAID', 'REFUNDED')).toBe(true);
      expect(canTransition('DELIVERED', 'PARTIALLY_REFUNDED')).toBe(true);
      expect(canTransition('PARTIALLY_REFUNDED', 'REFUNDED')).toBe(true);
    });

    it('rejects illegal jumps', () => {
      expect(canTransition('PENDING_PAYMENT', 'SHIPPED')).toBe(false);
      expect(canTransition('PENDING_PAYMENT', 'DELIVERED')).toBe(false);
      expect(canTransition('DELIVERED', 'PENDING_PAYMENT')).toBe(false);
      expect(canTransition('PAYMENT_FAILED', 'PAID')).toBe(false);
    });

    it('treats terminal states as terminal', () => {
      expect(canTransition('CANCELLED', 'PAID')).toBe(false);
      expect(canTransition('REFUNDED', 'PROCESSING')).toBe(false);
    });
  });

  describe('assertTransition', () => {
    it('does not throw for a legal transition', () => {
      expect(() => assertTransition('PENDING_PAYMENT', 'PAID')).not.toThrow();
    });

    it('throws BadRequestException for an illegal transition', () => {
      expect(() => assertTransition('PENDING_PAYMENT', 'DELIVERED')).toThrow(
        BadRequestException,
      );
    });
  });
});
