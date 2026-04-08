import { NextResponse } from "next/server";
import { EU_COUNTRIES } from "@/lib/market-map/eu-seed-data";
import { calculateCountryRevenue } from "@/lib/market-map/revenue-calculator";

export async function GET() {
  const totalSMEs = EU_COUNTRIES.reduce((sum, c) => sum + c.smeCount, 0);
  const totalEmployees = EU_COUNTRIES.reduce((sum, c) => sum + c.smeEmployees, 0);
  const totalGDP = EU_COUNTRIES.reduce((sum, c) => sum + c.gdpEur, 0);
  const avgScore = EU_COUNTRIES.reduce((sum, c) => sum + c.marketScore, 0) / EU_COUNTRIES.length;
  const totalRevenue = EU_COUNTRIES.reduce((sum, c) => sum + calculateCountryRevenue(c.smeCount).potentialRevenueEUR, 0);

  const topCountries = [...EU_COUNTRIES].sort((a, b) => b.marketScore - a.marketScore).slice(0, 10);

  const byRegion: Record<string, { count: number; smes: number; score: number }> = {};
  for (const c of EU_COUNTRIES) {
    if (!byRegion[c.region]) byRegion[c.region] = { count: 0, smes: 0, score: 0 };
    byRegion[c.region].count++;
    byRegion[c.region].smes += c.smeCount;
    byRegion[c.region].score += c.marketScore;
  }
  for (const r of Object.values(byRegion)) r.score = Math.round(r.score / r.count);

  return NextResponse.json({
    totalCountries: EU_COUNTRIES.length,
    totalSMEs, totalEmployees,
    totalGDP: Math.round(totalGDP),
    totalRevenue,
    avgMarketScore: Math.round(avgScore),
    topCountries: topCountries.map(c => ({ code: c.code, name: c.name, score: c.marketScore, smes: c.smeCount })),
    byRegion,
  });
}
