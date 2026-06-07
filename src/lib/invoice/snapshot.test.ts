import { describe, it, expect } from 'vitest';
import { buildIssuerSnapshot, buildBillToSnapshot } from './snapshot';

describe('snapshots', () => {
  it('captures issuer fields from settings', () => {
    const s = buildIssuerSnapshot({ business_name: 'IWC', address_line1: '1 Main', city: 'Beaufort', state: 'SC', postal_code: '29902', payment_instructions: 'Zelle: x' } as any);
    expect(s).toMatchObject({ business_name: 'IWC', city: 'Beaufort', payment_instructions: 'Zelle: x' });
  });
  it('captures bill-to fields from client', () => {
    const b = buildBillToSnapshot({ name: 'Acme', business_name: 'Acme LLC', email: 'a@b.com', address_line1: '2 Oak' } as any);
    expect(b).toMatchObject({ name: 'Acme', business_name: 'Acme LLC', email: 'a@b.com' });
  });
});
