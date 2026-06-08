import Stripe from 'stripe';

export function getStripe(): Stripe {
  const key = import.meta.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key);
}
