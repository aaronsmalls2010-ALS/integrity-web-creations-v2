import { z } from 'zod';

const optionalEmail = z.string().email().optional().or(z.literal('').transform(() => undefined));

export const clientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  business_name: z.string().trim().max(200).optional(),
  email: optionalEmail,
  phone: z.string().trim().max(40).optional(),
  address_line1: z.string().trim().max(200).optional(),
  address_line2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(50).optional(),
  postal_code: z.string().trim().max(20).optional(),
  country: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(5000).optional(),
  status: z.enum(['active', 'archived']).optional(),
});
export type ClientInput = z.infer<typeof clientSchema>;

export const serviceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(100).optional(),
  subcategory: z.string().trim().max(100).optional(),
  unit: z.string().trim().max(40).optional(),
  default_unit_price_cents: z.number().int().nonnegative(),
  default_quantity: z.number().positive().default(1),
  taxable: z.boolean().default(false),
  active: z.boolean().default(true),
  sort_order: z.number().int().optional(),
});
export type ServiceInput = z.infer<typeof serviceSchema>;

export const recurringLineSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().positive().default(1),
  unit_price_cents: z.number().int().nonnegative(),
  taxable: z.boolean().default(false),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const anchorMonth = z.string().regex(/^\d{4}-\d{2}$/, 'Anchor month must be YYYY-MM').optional();
const monthsInterval = z.number().int().min(1, 'Repeat every 1 month or more').max(12).default(1);

/** The Nth calendar day(s) of the month — 1st, 15th, or -1 for the last day. */
const dayOfMonthRuleSchema = z.object({
  type: z.literal('day_of_month'),
  days: z.array(z.number().int().refine((d) => d === -1 || (d >= 1 && d <= 31), 'Days must be 1–31, or -1 for the last day'))
    .min(1, 'Pick at least one day of the month').max(31),
  months_interval: monthsInterval,
  anchor_month: anchorMonth,
});

/** The Nth weekday(s) of the month — e.g. the 2nd and 4th Friday. */
const nthWeekdayRuleSchema = z.object({
  type: z.literal('nth_weekday'),
  weekday: z.number().int().min(0, 'Pick a day of the week').max(6),
  ordinals: z.array(z.number().int().refine((o) => o === -1 || (o >= 1 && o <= 5), 'Ordinals must be 1–5, or -1 for the last'))
    .min(1, 'Pick at least one week of the month').max(6),
  months_interval: monthsInterval,
  anchor_month: anchorMonth,
});

export const recurrenceRuleSchema = z.discriminatedUnion('type', [dayOfMonthRuleSchema, nthWeekdayRuleSchema]);
export type RecurrenceRuleInput = z.infer<typeof recurrenceRuleSchema>;

export const recurringSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  rule: recurrenceRuleSchema,
  /** No occurrence before this date is ever billed. */
  start_date: isoDate,
  /** Generate and send this many days before each billing date. */
  lead_days: z.number().int().min(0).max(90).default(0),
  due_mode: z.enum(['net_days', 'on_occurrence', 'fixed_day']).default('net_days'),
  /** Day of month the invoice is due when due_mode = fixed_day (clamped to short months). */
  due_day: z.number().int().min(1).max(31).nullable().default(null),
  /** Net-N override; null falls back to the account default. */
  due_days: z.number().int().min(0).max(365).nullable().default(null),
  auto_send: z.boolean().default(false),
  active: z.boolean().default(true),
  line_items: z.array(recurringLineSchema).min(1, 'At least one line item is required'),
}).transform((v) => ({
  ...v,
  // An every-N-months stride is meaningless without a month to count from, so
  // anchor it to the start date when the caller didn't say otherwise.
  rule: v.rule.months_interval > 1 && !v.rule.anchor_month
    ? { ...v.rule, anchor_month: v.start_date.slice(0, 7) }
    : v.rule,
}));
export type RecurringInput = z.infer<typeof recurringSchema>;

export const settingsSchema = z.object({
  business_name: z.string().trim().min(1, 'Business name is required').max(200),
  address_line1: z.string().trim().max(200).optional(),
  address_line2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(50).optional(),
  postal_code: z.string().trim().max(20).optional(),
  reply_to: z.string().trim().max(200).optional(),
  from_email: z.string().trim().max(200).optional(),
  invoice_number_prefix: z.string().trim().max(20).optional(),
  default_due_days: z.number().int().min(0).max(365),
  default_tax_rate: z.number().min(0).max(1),
  rollover_enabled: z.boolean().optional(),
  default_terms: z.string().trim().max(5000).optional(),
  payment_instructions: z.string().trim().max(5000).optional(),
});
export type SettingsInput = z.infer<typeof settingsSchema>;
