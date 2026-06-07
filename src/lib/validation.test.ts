import { describe, it, expect } from 'vitest';
import { clientSchema, serviceSchema } from './validation';

describe('clientSchema', () => {
  it('accepts a minimal valid client', () => {
    expect(clientSchema.parse({ name: 'Acme' }).name).toBe('Acme');
  });
  it('rejects empty name', () => {
    expect(clientSchema.safeParse({ name: '' }).success).toBe(false);
  });
  it('rejects malformed email', () => {
    expect(clientSchema.safeParse({ name: 'A', email: 'nope' }).success).toBe(false);
  });
});
describe('serviceSchema', () => {
  it('requires non-negative price', () => {
    expect(serviceSchema.safeParse({ name: 'Hosting', default_unit_price_cents: -1 }).success).toBe(false);
  });
});
