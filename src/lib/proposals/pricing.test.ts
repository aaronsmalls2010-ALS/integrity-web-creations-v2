// Gate G1 (FindersKeepers/docs/05-GUARDRAILS.md): every combination in docs/04 must price exactly.
import { describe, expect, it } from 'vitest';
import { summarize, assertDerivedPlans, validateSelection, normalizeSelection, computeStorePlan } from './pricing';
import { pricingConfigSchema, type Selection } from './schema';
import { PROPOSAL_CONFIGS } from '../../proposals/registry';
import raw from '../../proposals/finders-keepers/pricing.json';

const cfg = pricingConfigSchema.parse(raw);

// [route, package, plan, dueAtSigning, dueAtLaunch, monthly, monthlyAfter, total15mo] in DOLLARS
// Copied from docs/04 "Every combination". If this table changes, the doc changes too.
const TABLE: [Selection['route'], Selection['package'], Selection['plan'], number, number, number, number, number][] = [
  ['files_only', 'none', null, 1000, 0, 0, 0, 1000],
  ['website_support', 'none', null, 0, 0, 100, 100, 1500],
  ['website_support', 'featured_finds', 'full', 270, 0, 100, 100, 1770],
  ['website_support', 'featured_finds', 'split', 150, 150, 100, 100, 1800],
  ['website_support', 'featured_finds', 'monthly', 0, 0, 122, 100, 1830],
  ['website_support', 'shop_window', 'full', 2160, 0, 125, 125, 4035],
  ['website_support', 'shop_window', 'split', 1200, 1200, 125, 125, 4275],
  ['website_support', 'shop_window', 'monthly', 0, 0, 301, 125, 4515],
  ['website_support', 'main_street', 'full', 3015, 0, 125, 125, 4890],
  ['website_support', 'main_street', 'split', 1675, 1675, 125, 125, 5225],
  ['website_support', 'main_street', 'monthly', 0, 0, 371, 125, 5565],
  ['website_support', 'full_showroom', 'full', 4230, 0, 125, 125, 6105],
  ['website_support', 'full_showroom', 'split', 2350, 2350, 125, 125, 6575],
  ['website_support', 'full_showroom', 'monthly', 0, 0, 470, 125, 7050],
];

describe('pricing: every combination (docs/04)', () => {
  it('covers all 14 combinations', () => expect(TABLE).toHaveLength(14));
  for (const [route, pkg, plan, sign, launch, monthly, after, total] of TABLE) {
    it(`${route} / ${pkg} / ${plan ?? '-'}`, () => {
      const s = summarize(cfg, { route, package: pkg, plan });
      expect({
        sign: s.dueAtSigning, launch: s.dueAtLaunch, monthly: s.monthly, after: s.monthlyAfter, total: s.total15mo,
      }).toEqual({ sign: sign * 100, launch: launch * 100, monthly: monthly * 100, after: after * 100, total: total * 100 });
      expect(Number.isInteger(s.total15mo)).toBe(true);
    });
  }
});

describe('pricing: structural rules', () => {
  it('refuses a store on Files only (server)', () => {
    expect(validateSelection({ route: 'files_only', package: 'shop_window', plan: 'full' }).ok).toBe(false);
  });
  it('refuses a plan with no store (server)', () => {
    expect(validateSelection({ route: 'website_support', package: 'none', plan: 'full' }).ok).toBe(false);
  });
  it('refuses a store with no plan', () => {
    expect(validateSelection({ route: 'website_support', package: 'main_street', plan: null }).ok).toBe(false);
  });
  it('UI normalize: switching to Files only clears store and plan', () => {
    const r = normalizeSelection({ route: 'files_only', package: 'shop_window', plan: 'monthly' });
    expect(r).toEqual({ ok: true, selection: { route: 'files_only', package: 'none', plan: null } });
  });
  it('summarize throws on an invalid shape instead of guessing', () => {
    expect(() => summarize(cfg, { route: 'files_only', package: 'full_showroom', plan: 'full' })).toThrow();
  });
  it('monthly installment stops after 15: after-rate is the support rate', () => {
    const s = summarize(cfg, { route: 'website_support', package: 'shop_window', plan: 'monthly' });
    expect(s.installmentMonths).toBe(15);
    expect(s.installmentMonthly).toBe(17600);
    expect(s.monthly - s.installmentMonthly).toBe(s.monthlyAfter);
  });
});

describe('pricing: derived plans have teeth', () => {
  it('the shipped config matches the formulas', () => expect(() => assertDerivedPlans(cfg)).not.toThrow());
  it('positive control: the brief\'s $20 Featured Finds typo is caught', () => {
    const bad = structuredClone(cfg);
    bad.computed_store_plans.featured_finds!.monthly = 20;
    expect(() => assertDerivedPlans(bad)).toThrow(/featured_finds/);
  });
  it('odd-dollar split sends the extra dollar to launch', () => {
    expect(computeStorePlan(301, cfg).split).toEqual([150, 151]);
  });
  it('every registered config loads and validates', () => {
    expect(Object.keys(PROPOSAL_CONFIGS).sort()).toEqual(['demo', 'finders-keepers']);
  });
});
