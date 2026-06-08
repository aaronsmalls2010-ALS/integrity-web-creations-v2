import { describe, it, expect } from 'vitest';
import { agingBucket } from './aging';

describe('agingBucket', () => {
  const today = '2026-06-07';
  it('not yet due -> current', () => { expect(agingBucket('2026-06-20', today)).toBe('current'); });
  it('due today -> current', () => { expect(agingBucket('2026-06-07', today)).toBe('current'); });
  it('1-30 days late', () => { expect(agingBucket('2026-05-20', today)).toBe('1-30'); });
  it('31-60 days late', () => { expect(agingBucket('2026-04-20', today)).toBe('31-60'); });
  it('61-90 days late', () => { expect(agingBucket('2026-03-20', today)).toBe('61-90'); });
  it('90+ days late', () => { expect(agingBucket('2026-01-01', today)).toBe('90+'); });
});
