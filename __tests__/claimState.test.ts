import {
  GRACE_PERIOD_HOURS,
  APPEAL_WINDOW_DAYS,
  initialState,
  transition,
  escalate,
  proxyCanEdit,
  providerCanReview,
  appealWindowOpen,
} from '../src/lib/claimState';

describe('claim state machine', () => {
  describe('initialState', () => {
    it('starts as submitted when a receipt is attached', () => {
      expect(initialState({ type: 'submit', hasReceipt: true })).toEqual({
        status: 'submitted',
        enforcement: 'none',
      });
    });

    it('starts in grace when no receipt', () => {
      expect(initialState({ type: 'submit', hasReceipt: false })).toEqual({
        status: 'receipt_pending_grace',
        enforcement: 'none',
      });
    });

    it('uses a 72-hour grace period constant', () => {
      expect(GRACE_PERIOD_HOURS).toBe(72);
    });
  });

  describe('transition', () => {
    it('promotes from grace to submitted when a receipt arrives', () => {
      const start = initialState({ type: 'submit', hasReceipt: false });
      const next = transition(start, { type: 'attach_receipt' });
      expect(next.status).toBe('submitted');
    });

    it('also accepts attach_receipt when already overdue', () => {
      const overdue = { status: 'receipt_overdue' as const, enforcement: 'deductible' as const };
      const next = transition(overdue, { type: 'attach_receipt' });
      expect(next.status).toBe('submitted');
    });

    it('moves grace -> receipt_overdue on grace_expired with deductible enforcement', () => {
      const start = initialState({ type: 'submit', hasReceipt: false });
      const next = transition(start, { type: 'grace_expired' });
      expect(next).toEqual({ status: 'receipt_overdue', enforcement: 'deductible' });
    });

    it('rejects grace_expired from a non-grace state', () => {
      expect(() =>
        transition({ status: 'submitted', enforcement: 'none' }, { type: 'grace_expired' }),
      ).toThrow(/Invalid transition/);
    });

    it('approves a submitted claim', () => {
      const s = { status: 'submitted' as const, enforcement: 'none' as const };
      expect(transition(s, { type: 'review', action: 'approve' }).status).toBe('approved');
    });

    it('denies a submitted claim', () => {
      const s = { status: 'submitted' as const, enforcement: 'none' as const };
      expect(transition(s, { type: 'review', action: 'deny' }).status).toBe('denied');
    });

    it('requests correction', () => {
      const s = { status: 'submitted' as const, enforcement: 'none' as const };
      expect(transition(s, { type: 'review', action: 'request_correction' }).status).toBe('correction_requested');
    });

    it('escalates and bumps enforcement one level by default', () => {
      const s = { status: 'receipt_overdue' as const, enforcement: 'deductible' as const };
      const next = transition(s, { type: 'review', action: 'escalate' });
      expect(next.status).toBe('escalated');
      expect(next.enforcement).toBe('suspended');
    });

    it('refuses review on an already-approved claim', () => {
      const s = { status: 'approved' as const, enforcement: 'none' as const };
      expect(() => transition(s, { type: 'review', action: 'deny' })).toThrow(/Invalid transition/);
    });

    it('allows appeal after denial', () => {
      const s = { status: 'denied' as const, enforcement: 'none' as const };
      expect(transition(s, { type: 'submit_appeal' }).status).toBe('appealed');
    });

    it('refuses appeal when not in a denied/corrected/escalated state', () => {
      const s = { status: 'approved' as const, enforcement: 'none' as const };
      expect(() => transition(s, { type: 'submit_appeal' })).toThrow();
    });

    it('resolves an appeal only when appealed', () => {
      expect(
        transition({ status: 'appealed', enforcement: 'none' }, { type: 'resolve_appeal' }).status,
      ).toBe('appeal_resolved');
      expect(() =>
        transition({ status: 'submitted', enforcement: 'none' }, { type: 'resolve_appeal' }),
      ).toThrow();
    });

    it('resubmit returns correction_requested back to submitted', () => {
      const s = { status: 'correction_requested' as const, enforcement: 'none' as const };
      expect(transition(s, { type: 'resubmit' }).status).toBe('submitted');
    });
  });

  describe('escalate', () => {
    it('bumps enforcement levels', () => {
      expect(escalate('none')).toBe('warning');
      expect(escalate('warning')).toBe('deductible');
      expect(escalate('deductible')).toBe('suspended');
    });
    it('caps at suspended', () => { expect(escalate('suspended')).toBe('suspended'); });
  });

  describe('role guards', () => {
    it('proxyCanEdit is true only for editable states', () => {
      expect(proxyCanEdit('submitted')).toBe(true);
      expect(proxyCanEdit('receipt_pending_grace')).toBe(true);
      expect(proxyCanEdit('correction_requested')).toBe(true);
      expect(proxyCanEdit('approved')).toBe(false);
      expect(proxyCanEdit('denied')).toBe(false);
    });

    it('providerCanReview covers reviewable states', () => {
      expect(providerCanReview('submitted')).toBe(true);
      expect(providerCanReview('receipt_overdue')).toBe(true);
      expect(providerCanReview('appealed')).toBe(true);
      expect(providerCanReview('approved')).toBe(false);
    });
  });

  describe('appealWindowOpen', () => {
    it('returns true inside the 7-day window', () => {
      const deniedAt = new Date('2026-04-20T12:00:00Z');
      const now = new Date('2026-04-22T12:00:00Z');
      expect(appealWindowOpen(deniedAt, now)).toBe(true);
    });

    it('returns false after the 7-day window', () => {
      const deniedAt = new Date('2026-04-10T12:00:00Z');
      const now = new Date('2026-04-20T12:00:00Z');
      expect(appealWindowOpen(deniedAt, now)).toBe(false);
    });

    it('uses APPEAL_WINDOW_DAYS = 7', () => {
      expect(APPEAL_WINDOW_DAYS).toBe(7);
    });
  });
});
