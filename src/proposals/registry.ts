/**
 * Per-client proposal configs. A new client = a new folder in src/proposals/<slug>/ + one line here.
 * "Create proposal" in admin copies the config into the DB snapshot, so later edits never change a sent proposal.
 */
import { pricingConfigSchema, type PricingConfig } from '../lib/proposals/schema';
import { assertDerivedPlans } from '../lib/proposals/pricing';
import findersKeepersPricing from './finders-keepers/pricing.json';

export interface ProposalConfig {
  slug: string;
  pricing: PricingConfig;
}

function load(slug: string, rawPricing: unknown): ProposalConfig {
  const pricing = pricingConfigSchema.parse(rawPricing);
  assertDerivedPlans(pricing);
  return { slug, pricing };
}

export const PROPOSAL_CONFIGS: Record<string, ProposalConfig> = {
  'finders-keepers': load('finders-keepers', findersKeepersPricing),
  // Demo ("Sample Shop") uses the same pricing so QA exercises the real numbers.
  demo: load('demo', findersKeepersPricing),
};

export function getProposalConfig(slug: string): ProposalConfig | undefined {
  return Object.hasOwn(PROPOSAL_CONFIGS, slug) ? PROPOSAL_CONFIGS[slug] : undefined;
}
