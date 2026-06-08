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
  default_unit_price_cents: z.number().int().nonnegative(),
  default_quantity: z.number().positive().default(1),
  taxable: z.boolean().default(false),
  active: z.boolean().default(true),
});
export type ServiceInput = z.infer<typeof serviceSchema>;

export const recurringLineSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().positive().default(1),
  unit_price_cents: z.number().int().nonnegative(),
  taxable: z.boolean().default(false),
});

export const recurringSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  interval: z.enum(['monthly', 'quarterly', 'annual']),
  interval_count: z.number().int().positive().default(1),
  next_run_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'next_run_date must be YYYY-MM-DD'),
  auto_send: z.boolean().default(false),
  active: z.boolean().default(true),
  line_items: z.array(recurringLineSchema).min(1, 'At least one line item is required'),
});
export type RecurringInput = z.infer<typeof recurringSchema>;
