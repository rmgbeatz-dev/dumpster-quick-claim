import type { ClaimStatus, EnforcementLevel } from '../types/db';

/**
 * Claim state machine. Pure and stand-alone so the same logic powers the
 * app UI, edge function guards, and tests.
 *
 * Lifecycle
 *
 *   submitted ──────────► under_review ──► approved
 *     │                       │         └► denied ──► appealed ──► appeal_resolved
 *     │                       └► correction_requested ──► submitted (re-submit)
 *     │
 *     └── receipt_pending_grace ──Day3──► receipt_overdue ──► escalated
 *                             └──receipt uploaded──► submitted
 */

export const GRACE_PERIOD_HOURS = 72;
export const APPEAL_WINDOW_DAYS = 7;

export type ReviewAction = 'approve' | 'deny' | 'request_correction' | 'escalate';

export type ClaimEvent =
  | { type: 'submit'; hasReceipt: boolean }
  | { type: 'attach_receipt' }
  | { type: 'grace_expired' }
  | { type: 'review'; action: ReviewAction; enforcement?: EnforcementLevel }
  | { type: 'submit_appeal' }
  | { type: 'resolve_appeal' }
  | { type: 'resubmit' };

export interface ClaimMachineState {
  status: ClaimStatus;
  enforcement: EnforcementLevel;
}

export function initialState(event: Extract<ClaimEvent, { type: 'submit' }>): ClaimMachineState {
  return {
    status: event.hasReceipt ? 'submitted' : 'receipt_pending_grace',
    enforcement: 'none',
  };
}

/** Pure reducer. Throws for invalid transitions so the caller can surface UI errors. */
export function transition(state: ClaimMachineState, event: ClaimEvent): ClaimMachineState {
  switch (event.type) {
    case 'submit':
      return initialState(event);

    case 'attach_receipt':
      if (state.status === 'receipt_pending_grace' || state.status === 'receipt_overdue') {
        return { ...state, status: 'submitted' };
      }
      throw invalid(state, event);

    case 'grace_expired':
      if (state.status === 'receipt_pending_grace') {
        return { status: 'receipt_overdue', enforcement: 'deductible' };
      }
      throw invalid(state, event);

    case 'review':
      return review(state, event.action, event.enforcement);

    case 'submit_appeal':
      if (state.status === 'denied' || state.status === 'correction_requested' || state.status === 'escalated') {
        return { ...state, status: 'appealed' };
      }
      throw invalid(state, event);

    case 'resolve_appeal':
      if (state.status === 'appealed') return { ...state, status: 'appeal_resolved' };
      throw invalid(state, event);

    case 'resubmit':
      if (state.status === 'correction_requested') return { ...state, status: 'submitted' };
      throw invalid(state, event);
  }
}

function review(state: ClaimMachineState, action: ReviewAction, enforcement?: EnforcementLevel): ClaimMachineState {
  const canReview: ClaimStatus[] = ['submitted', 'under_review', 'receipt_overdue', 'appealed'];
  if (!canReview.includes(state.status)) throw invalid(state, { type: 'review', action });

  switch (action) {
    case 'approve': return { status: 'approved', enforcement: state.enforcement };
    case 'deny':    return { status: 'denied',   enforcement: state.enforcement };
    case 'request_correction':
      return { status: 'correction_requested', enforcement: state.enforcement };
    case 'escalate':
      return { status: 'escalated', enforcement: enforcement ?? escalate(state.enforcement) };
  }
}

/** Bumps enforcement one level. */
export function escalate(level: EnforcementLevel): EnforcementLevel {
  switch (level) {
    case 'none':       return 'warning';
    case 'warning':    return 'deductible';
    case 'deductible': return 'suspended';
    case 'suspended':  return 'suspended';
  }
}

function invalid(state: ClaimMachineState, event: ClaimEvent): Error {
  return new Error(`Invalid transition from ${state.status} on ${event.type}`);
}

/** Returns whether a proxy can still edit the claim (before provider locks it). */
export function proxyCanEdit(status: ClaimStatus): boolean {
  return status === 'submitted' || status === 'receipt_pending_grace' || status === 'correction_requested';
}

/** Returns whether a provider can act on this claim. */
export function providerCanReview(status: ClaimStatus): boolean {
  return status === 'submitted' || status === 'receipt_overdue' || status === 'appealed';
}

/** Whether an appeal can still be filed given denial time + window. */
export function appealWindowOpen(deniedAt: string | Date, now: Date = new Date()): boolean {
  const deniedTs = typeof deniedAt === 'string' ? new Date(deniedAt).getTime() : deniedAt.getTime();
  const windowMs = APPEAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() - deniedTs <= windowMs;
}
