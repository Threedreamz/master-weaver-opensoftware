/**
 * Revenue Calculator — estimates potential MW platform revenue
 * from SME market data at country, PLZ, and individual lead level.
 *
 * MW Platform tiers: Micro €299/mo, Starter €799/mo, Growth €1,999/mo, Scale €3,999/mo
 * Average ticket: ~€1,500/mo = €18,000/yr
 * Addressable rate: 0.1% of total SMEs (conservative for Year 1-3)
 */

const AVG_ANNUAL_TICKET_EUR = 18_000; // ~€1,500/mo average across tiers
const ADDRESSABLE_RATE = 0.001; // 0.1% of SMEs are realistic MW targets

export interface RevenueEstimate {
  totalSMEs: number;
  addressableSMEs: number;
  addressableRate: number;
  potentialRevenueEUR: number;
  avgTicketEUR: number;
  formattedRevenue: string;
}

/** Calculate potential revenue for a country */
export function calculateCountryRevenue(smeCount: number): RevenueEstimate {
  const addressable = Math.round(smeCount * ADDRESSABLE_RATE);
  const revenue = addressable * AVG_ANNUAL_TICKET_EUR;
  return {
    totalSMEs: smeCount,
    addressableSMEs: addressable,
    addressableRate: ADDRESSABLE_RATE,
    potentialRevenueEUR: revenue,
    avgTicketEUR: AVG_ANNUAL_TICKET_EUR,
    formattedRevenue: formatEUR(revenue),
  };
}

/** Calculate potential revenue for a postal code area */
export function calculatePLZRevenue(localSmeCount: number): RevenueEstimate {
  // PLZ-level has higher addressable rate (more targeted)
  const plzRate = ADDRESSABLE_RATE * 2; // 0.2% for local targeting
  const addressable = Math.max(1, Math.round(localSmeCount * plzRate));
  const revenue = addressable * AVG_ANNUAL_TICKET_EUR;
  return {
    totalSMEs: localSmeCount,
    addressableSMEs: addressable,
    addressableRate: plzRate,
    potentialRevenueEUR: revenue,
    avgTicketEUR: AVG_ANNUAL_TICKET_EUR,
    formattedRevenue: formatEUR(revenue),
  };
}

/** Calculate projected annual value for an individual lead */
export function calculateLeadRevenue(leadScore: number, tier?: string): RevenueEstimate {
  const tierPrices: Record<string, number> = {
    micro: 299 * 12,
    starter: 799 * 12,
    growth: 1999 * 12,
    scale: 3999 * 12,
  };
  const annualTicket = tierPrices[tier ?? "starter"] ?? AVG_ANNUAL_TICKET_EUR;
  const probability = leadScore / 100; // score as conversion probability
  const revenue = Math.round(annualTicket * probability);
  return {
    totalSMEs: 1,
    addressableSMEs: 1,
    addressableRate: probability,
    potentialRevenueEUR: revenue,
    avgTicketEUR: annualTicket,
    formattedRevenue: formatEUR(revenue),
  };
}

/** Format EUR amount for map labels */
export function formatEUR(amount: number): string {
  if (amount >= 1_000_000_000) return `\u20AC${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `\u20AC${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `\u20AC${(amount / 1_000).toFixed(0)}K`;
  return `\u20AC${amount.toLocaleString()}`;
}

/** Get bubble radius for revenue amount (logarithmic scale for map) */
export function getRevenueBubbleRadius(revenueEUR: number): number {
  if (revenueEUR <= 0) return 6;
  // Log scale: €10K=8px, €100K=16px, €1M=24px, €10M=32px, €100M=40px
  const logValue = Math.log10(Math.max(1, revenueEUR));
  return Math.min(50, Math.max(6, (logValue - 3) * 8));
}
