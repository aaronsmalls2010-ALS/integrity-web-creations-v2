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
