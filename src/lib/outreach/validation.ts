import { z } from 'zod';

export const LEAD_STATUSES = [
  'new', 'qualified', 'queued', 'contacted', 'followup_1', 'followup_2',
  'replied', 'won', 'lost', 'opted_out', 'invalid',
] as const;

export const WEB_PRESENCES = [
  'none', 'facebook_only', 'google_only', 'bad_website', 'ok_website', 'unknown',
] as const;

export const leadSchema = z.object({
  business_name: z.string().trim().min(1, 'Business name is required').max(200),
  category: z.string().trim().min(1).max(60).default('other'),
  town: z.string().trim().max(120).optional().nullable(),
  contact_name: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().toLowerCase().email('Invalid email').max(254).optional().nullable().or(z.literal('').transform(() => null)),
  phone: z.string().trim().max(40).optional().nullable(),
  facebook_url: z.string().trim().url('Invalid URL').max(500).optional().nullable().or(z.literal('').transform(() => null)),
  website_url: z.string().trim().url('Invalid URL').max(500).optional().nullable().or(z.literal('').transform(() => null)),
  web_presence: z.enum(WEB_PRESENCES).default('unknown'),
  presence_notes: z.string().trim().max(2000).optional().nullable(),
  pitch_angle: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
});
export type LeadInput = z.infer<typeof leadSchema>;

export const messageEditSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  body: z.string().trim().min(1, 'Body is required').max(10000),
});

export const settingsSchema = z.object({
  daily_cap: z.number().int().min(1).max(25),
  min_gap_minutes: z.number().int().min(1).max(120),
  max_gap_minutes: z.number().int().min(1).max(240),
  send_window_start: z.number().int().min(0).max(23),
  send_window_end: z.number().int().min(1).max(24),
  kill_switch: z.boolean(),
  from_name: z.string().trim().min(1).max(100),
  physical_address: z.string().trim().max(300),
}).refine((s) => s.max_gap_minutes >= s.min_gap_minutes, {
  message: 'Max gap must be >= min gap',
}).refine((s) => s.send_window_end > s.send_window_start, {
  message: 'Send window end must be after start',
});

export const researchSchema = z.object({
  area: z.string().trim().min(2).max(200),
  categories: z.string().trim().min(2).max(400),
  max_candidates: z.number().int().min(1).max(20).default(10),
});

/** Hard ceiling on daily sends — enforced in the engine regardless of settings. */
export const HARD_DAILY_CEILING = 25;
