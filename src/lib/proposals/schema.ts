/**
 * IWC Proposals: typed, validated per-client pricing config.
 * Spec: FindersKeepers/docs/04-PRICING-AND-AGREEMENT.md. Config amounts are whole DOLLARS (as written in
 * the brief); the pricing engine converts to integer cents.
 */
import { z } from 'zod';

export const ROUTES = ['files_only', 'website_support'] as const;
export const PACKAGES = ['none', 'featured_finds', 'shop_window', 'main_street', 'full_showroom'] as const;
export const STORE_PACKAGES = ['featured_finds', 'shop_window', 'main_street', 'full_showroom'] as const;
export const PLANS = ['full', 'split', 'monthly'] as const;

export type Route = (typeof ROUTES)[number];
export type PackageKey = (typeof PACKAGES)[number];
export type StorePackageKey = (typeof STORE_PACKAGES)[number];
export type Plan = (typeof PLANS)[number];

const dollars = z.number().int().nonnegative().max(1_000_000);

const storePackage = z.object({
  label: z.string().min(1).max(60),
  price: dollars,
  items_loaded: z.number().int().nonnegative(),
  categories: z.number().int().nonnegative(),
  checkout: z.boolean(),
  phone_app: z.boolean(),
  labels_consignment: z.boolean(),
  collector_features: z.boolean(),
  monthly_support: dollars,
  recommended: z.boolean().optional(),
});

export const pricingConfigSchema = z.object({
  currency: z.literal('USD'),
  website_routes: z.object({
    files_only: z.object({
      label: z.string(), price_one_time: dollars, monthly: z.literal(0), includes: z.string(),
    }),
    website_support: z.object({
      label: z.string(), price_one_time: z.literal(0), monthly: dollars,
      minimum_months: z.number().int().positive(), includes: z.string(),
    }),
  }),
  store_packages: z.object({
    featured_finds: storePackage,
    shop_window: storePackage,
    main_street: storePackage,
    full_showroom: storePackage,
  }),
  store_requires_route: z.literal('website_support'),
  payment_plans: z.object({
    full: z.object({ label: z.string(), discount_pct: z.number().int().min(0).max(50) }),
    split: z.object({ label: z.string() }),
    monthly: z.object({
      label: z.string(), markup_pct: z.number().int().min(0).max(50), months: z.number().int().min(2).max(36),
    }),
  }),
  /** Derived values, kept in the JSON for humans. `assertDerivedPlans` proves they match the formulas. */
  computed_store_plans: z.record(
    z.enum(STORE_PACKAGES),
    z.object({ full: dollars, split: z.tuple([dollars, dollars]), monthly: dollars }),
  ),
  add_ons: z.object({
    standard_pack_10: dollars,
    collector_pack_10: dollars,
    own_photos_discount_per_10: dollars,
    extra_category: dollars,
    extra_history_article: dollars,
  }),
  featured_finds_upgrade_credit_months: z.number().int().nonnegative(),
  store_support_hours_included: z.number().nonnegative(),
  /** Dollars per hour, or a "[placeholder]" string until Aaron fills it (Send refuses placeholders). */
  hourly_rate_beyond_support: z.union([dollars, z.string().regex(/^\[.+\]$/)]),
});
export type PricingConfig = z.infer<typeof pricingConfigSchema>;

/** What the client picks. Server input for POST /api/p/[token]/select. */
export const selectionSchema = z.object({
  route: z.enum(ROUTES),
  package: z.enum(PACKAGES).default('none'),
  plan: z.enum(PLANS).nullable().default(null),
});
export type Selection = z.infer<typeof selectionSchema>;
