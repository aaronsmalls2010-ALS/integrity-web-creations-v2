import type { InvoiceStatus } from './status';

// Voiding rules, kept out of the UI on purpose.
//
// Before this file, the only thing stopping a paid invoice being voided was a
// condition in the admin page template. Anything calling POST /void directly
// went straight through. Business rules that live only in a button are rules
// that hold until somebody uses the API.

export type VoidRefusal =
  | 'already_void'
  | 'has_payments'
  | 'rolled'
  | 'unknown_status';

export type VoidDecision =
  /** An issued invoice. Status becomes void and the record stays. */
  | { allowed: true; action: 'void' }
  /** A draft was never issued: no number was consumed, so nothing is preserved
   *  by keeping it. This is the ONE case where removing the row is correct, and
   *  it is named rather than hidden inside "void". */
  | { allowed: true; action: 'delete_draft' }
  | { allowed: false; reason: VoidRefusal };

const KNOWN: InvoiceStatus[] = ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void', 'rolled'];

/**
 * May this invoice be voided?
 *
 * A paid or part paid invoice is refused. Money has moved, so the correction is
 * a refund or a credit note, not a void: voiding it would leave a payment
 * attached to an invoice that claims never to have existed.
 */
export function decideVoid(input: {
  status: InvoiceStatus;
  amountPaidCents: number;
}): VoidDecision {
  if (!KNOWN.includes(input.status)) return { allowed: false, reason: 'unknown_status' };
  if (input.status === 'void') return { allowed: false, reason: 'already_void' };
  // Its balance now lives on a later invoice. Voiding this one would not remove
  // that debt, it would just hide where it came from.
  if (input.status === 'rolled') return { allowed: false, reason: 'rolled' };
  if (input.amountPaidCents > 0 || input.status === 'paid' || input.status === 'partial') {
    return { allowed: false, reason: 'has_payments' };
  }
  if (input.status === 'draft') return { allowed: true, action: 'delete_draft' };
  return { allowed: true, action: 'void' };
}

/** Plain wording for the admin, never jargon. */
export function refusalMessage(reason: VoidRefusal): string {
  switch (reason) {
    case 'already_void':
      return 'This invoice is already voided.';
    case 'has_payments':
      return 'This invoice has a payment against it. Refund the payment first, or issue a credit note. Voiding it would leave money attached to an invoice that says it never existed.';
    case 'rolled':
      return 'This invoice was closed because its balance was carried onto a later invoice. Void or adjust that invoice instead; voiding it restores this one.';
    case 'unknown_status':
      return 'This invoice has a status the system does not recognise, so it will not be voided automatically.';
  }
}

export const MIN_REASON_LENGTH = 3;
export const MAX_REASON_LENGTH = 300;

/**
 * A void with no reason is a much weaker record than a void with one. "Wrong
 * amount" is the whole point of the entry when somebody asks about the gap in
 * the sequence a year later.
 */
export function normalizeReason(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const reason = raw.trim().replace(/\s+/g, ' ');
  if (reason.length < MIN_REASON_LENGTH) return null;
  return reason.slice(0, MAX_REASON_LENGTH);
}
