import { z } from 'zod';
export const paymentSchema = z.object({
  amount_cents: z.number().int().positive(),
  method: z.enum(['stripe','check','zelle','cash','other']),
  reference: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
  paid_at: z.string().optional(),
});
export { recordPayment } from './invoices';
