/**
 * IWC Proposals pricing engine. Pure: no I/O. Imported by BOTH the PlanPicker island (instant numbers) and
 * the server (the numbers that get stored and signed). The browser never supplies an amount.
 * Rules + the full expected table: FindersKeepers/docs/04-PRICING-AND-AGREEMENT.md.
 */
import type { PricingConfig, Selection, StorePackageKey, Plan } from './schema';

export interface StorePlanDollars { full: number; split: [number, number]; monthly: number }

export interface Summary {
  /** All integer cents. */
  dueAtSigning: number;
  dueAtLaunch: number;
  /** Each month from launch (support + store installment while it runs). */
  monthly: number;
  /** Each month once the 15 installments are done (the support rate). */
  monthlyAfter: number;
  /** Everything paid up front plus the first `months` monthly payments. */
  total15mo: number;
  supportMonthly: number;
  installmentMonthly: number;
  installmentMonths: number;
}

export type SelectionResult =
  | { ok: true; selection: Selection }
  | { ok: false; error: string };

const isStore = (p: Selection['package']): p is StorePackageKey => p !== 'none';

/**
 * Store plan amounts from the package price, using whole-dollar integer math:
 *   full    = round(price × (100 − discount) / 100)
 *   split   = price / 2 now, the rest at launch (an odd dollar goes to launch)
 *   monthly = round(price × (100 + markup) / (100 × months))
 */
export function computeStorePlan(price: number, cfg: PricingConfig): StorePlanDollars {
  const { discount_pct } = cfg.payment_plans.full;
  const { markup_pct, months } = cfg.payment_plans.monthly;
  const first = Math.floor(price / 2);
  return {
    full: Math.round((price * (100 - discount_pct)) / 100),
    split: [first, price - first],
    monthly: Math.round((price * (100 + markup_pct)) / (100 * months)),
  };
}

/** Throws if the human-readable `computed_store_plans` in a config disagrees with the formulas. */
export function assertDerivedPlans(cfg: PricingConfig): void {
  for (const key of Object.keys(cfg.store_packages) as StorePackageKey[]) {
    const want = computeStorePlan(cfg.store_packages[key].price, cfg);
    const got = cfg.computed_store_plans[key];
    if (!got) throw new Error(`computed_store_plans.${key} is missing`);
    const same = got.full === want.full && got.monthly === want.monthly &&
      got.split[0] === want.split[0] && got.split[1] === want.split[1];
    if (!same) {
      throw new Error(
        `computed_store_plans.${key} is ${JSON.stringify(got)} but the formulas give ${JSON.stringify(want)}`,
      );
    }
  }
}

/**
 * Enforce the structural rules. Files only clears the store and plan; no store clears the plan;
 * a store needs a plan. Returns the normalized selection or a plain-English error.
 */
export function normalizeSelection(sel: Selection): SelectionResult {
  if (sel.route === 'files_only') return { ok: true, selection: { route: 'files_only', package: 'none', plan: null } };
  if (!isStore(sel.package)) return { ok: true, selection: { route: 'website_support', package: 'none', plan: null } };
  if (!sel.plan) return { ok: false, error: 'Please choose how you would like to pay for the store.' };
  return { ok: true, selection: { route: 'website_support', package: sel.package, plan: sel.plan } };
}

/** Strict form for the server: refuses (instead of fixing) shapes the UI should never send. */
export function validateSelection(sel: Selection): SelectionResult {
  if (sel.route === 'files_only' && (sel.package !== 'none' || sel.plan !== null)) {
    return { ok: false, error: 'The online store is only available with Website + support.' };
  }
  if (sel.package === 'none' && sel.plan !== null) {
    return { ok: false, error: 'A payment plan only applies when a store package is chosen.' };
  }
  return normalizeSelection(sel);
}

const c = (dollars: number) => dollars * 100;

export function summarize(cfg: PricingConfig, raw: Selection): Summary {
  const v = validateSelection(raw);
  if (!v.ok) throw new Error(v.error);
  const sel = v.selection;
  const months = cfg.payment_plans.monthly.months;

  if (sel.route === 'files_only') {
    const once = c(cfg.website_routes.files_only.price_one_time);
    return { dueAtSigning: once, dueAtLaunch: 0, monthly: 0, monthlyAfter: 0, total15mo: once,
             supportMonthly: 0, installmentMonthly: 0, installmentMonths: 0 };
  }

  const baseSupport = c(cfg.website_routes.website_support.monthly);
  if (!isStore(sel.package)) {
    return { dueAtSigning: 0, dueAtLaunch: 0, monthly: baseSupport, monthlyAfter: baseSupport,
             total15mo: baseSupport * months, supportMonthly: baseSupport, installmentMonthly: 0, installmentMonths: 0 };
  }

  const pkg = cfg.store_packages[sel.package];
  const support = c(pkg.monthly_support);
  const plan = computeStorePlan(pkg.price, cfg);
  const p = sel.plan as Plan;

  let dueAtSigning = 0;
  let dueAtLaunch = 0;
  let installment = 0;
  if (p === 'full') dueAtSigning = c(plan.full);
  else if (p === 'split') { dueAtSigning = c(plan.split[0]); dueAtLaunch = c(plan.split[1]); }
  else installment = c(plan.monthly);

  const monthly = support + installment;
  return {
    dueAtSigning, dueAtLaunch, monthly, monthlyAfter: support,
    total15mo: dueAtSigning + dueAtLaunch + monthly * months,
    supportMonthly: support, installmentMonthly: installment, installmentMonths: installment ? months : 0,
  };
}
