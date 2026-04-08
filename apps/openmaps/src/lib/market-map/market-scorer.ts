/**
 * Market Scoring Algorithm for SME market potential.
 * Produces a 0-100 composite score.
 */

interface CountryScoreInput {
  smeCount: number;
  population: number;
  gdpEur: number; // billions
  smeEmployees: number;
  registerAccessible: boolean; // does the country have an API-accessible register?
}

interface PLZScoreInput {
  smeCount: number;
  population: number;
  avgRevenueEur?: number;
  targetNaceMatch?: number; // 0-1, how many SMEs match target NACE sectors
  newRegistrations?: number; // recent company registrations (growth signal)
  competitorCount?: number;
}

export function scoreCountry(input: CountryScoreInput): number {
  // SME density per 1K population (weight: 25%)
  const smeDensity = Math.min(100, (input.smeCount / input.population) * 1000 * 2.5);

  // GDP per capita indicator (weight: 20%)
  const gdpPerCapita = (input.gdpEur * 1_000_000_000) / input.population;
  const gdpScore = Math.min(100, (gdpPerCapita / 50_000) * 100);

  // SME employment share (weight: 20%)
  const employmentShare = input.smeEmployees / input.population;
  const employmentScore = Math.min(100, employmentShare * 400);

  // Register accessibility (weight: 15%)
  const registerScore = input.registerAccessible ? 80 : 30;

  // Absolute market size (weight: 20%)
  const sizeScore = Math.min(100, Math.log10(Math.max(1, input.smeCount)) * 15);

  const score =
    smeDensity * 0.25 +
    gdpScore * 0.20 +
    employmentScore * 0.20 +
    registerScore * 0.15 +
    sizeScore * 0.20;

  return Math.round(Math.max(0, Math.min(100, score)));
}

export function scorePLZ(input: PLZScoreInput): number {
  // Local SME count (weight: 30%)
  const smeScore = Math.min(100, Math.log10(Math.max(1, input.smeCount)) * 30);

  // Population density proxy (weight: 20%)
  const popScore = Math.min(100, Math.log10(Math.max(1, input.population)) * 20);

  // Average revenue (weight: 20%)
  const revenueScore = input.avgRevenueEur
    ? Math.min(100, (input.avgRevenueEur / 5_000_000) * 100)
    : 50; // default to medium if unknown

  // Target sector match (weight: 15%)
  const naceScore = (input.targetNaceMatch ?? 0.5) * 100;

  // Growth signal (weight: 15%)
  const growthScore = input.newRegistrations
    ? Math.min(100, input.newRegistrations * 10)
    : 50;

  const score =
    smeScore * 0.30 +
    popScore * 0.20 +
    revenueScore * 0.20 +
    naceScore * 0.15 +
    growthScore * 0.15;

  return Math.round(Math.max(0, Math.min(100, score)));
}

/** Lead scoring based on enrichment data */
export function scoreLead(input: {
  hasVatId: boolean;
  vatValid?: boolean;
  hasRegisterData: boolean;
  creditScore?: number; // 100-600 (Creditreform)
  hasContactEmail: boolean;
  employeesRange?: string;
  revenueRange?: string;
  insolvencyRisk?: boolean;
}): number {
  let score = 0;

  // VAT validated (20 points)
  if (input.hasVatId) score += 10;
  if (input.vatValid) score += 10;

  // Register data available (15 points)
  if (input.hasRegisterData) score += 15;

  // Credit score (20 points)
  if (input.creditScore) {
    if (input.creditScore <= 200) score += 20; // Excellent
    else if (input.creditScore <= 300) score += 15; // Good
    else if (input.creditScore <= 400) score += 10; // Fair
    else score += 5; // Poor
  }

  // Contact available (15 points)
  if (input.hasContactEmail) score += 15;

  // Company size (15 points)
  if (input.employeesRange) {
    if (input.employeesRange === "50-249") score += 15;
    else if (input.employeesRange === "10-49") score += 12;
    else if (input.employeesRange === "1-9") score += 8;
  }

  // Revenue (15 points)
  if (input.revenueRange) {
    if (input.revenueRange === "10-50M") score += 15;
    else if (input.revenueRange === "2-10M") score += 12;
    else if (input.revenueRange === "0-2M") score += 8;
  }

  // Insolvency penalty (-30 points)
  if (input.insolvencyRisk) score -= 30;

  return Math.max(0, Math.min(100, score));
}
