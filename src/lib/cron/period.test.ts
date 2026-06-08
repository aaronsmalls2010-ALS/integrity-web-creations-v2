import { describe, it, expect } from 'vitest';
import { nextRunDate, periodKey } from './period';

describe('nextRunDate', () => {
  it('advances monthly', () => { expect(nextRunDate('2026-06-15','monthly',1)).toBe('2026-07-15'); });
  it('advances quarterly', () => { expect(nextRunDate('2026-01-10','quarterly',1)).toBe('2026-04-10'); });
  it('advances annual', () => { expect(nextRunDate('2026-02-01','annual',1)).toBe('2027-02-01'); });
  it('honors interval_count', () => { expect(nextRunDate('2026-01-01','monthly',2)).toBe('2026-03-01'); });
});
describe('periodKey', () => {
  it('monthly -> YYYY-MM', () => { expect(periodKey('2026-06-15','monthly')).toBe('2026-06'); });
  it('quarterly -> YYYY-Qn', () => { expect(periodKey('2026-06-15','quarterly')).toBe('2026-Q2'); });
  it('annual -> YYYY', () => { expect(periodKey('2026-06-15','annual')).toBe('2026'); });
});
