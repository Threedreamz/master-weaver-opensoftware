import { NextResponse } from "next/server";
import { EU_COUNTRIES } from "@/lib/market-map/eu-seed-data";
import { EU_COUNTRY_CENTERS } from "@/lib/market-map/geo-utils";
import { calculateCountryRevenue } from "@/lib/market-map/revenue-calculator";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";

  const totalSMEs = EU_COUNTRIES.reduce((sum, c) => sum + c.smeCount, 0);
  const totalEmployees = EU_COUNTRIES.reduce((sum, c) => sum + c.smeEmployees, 0);

  if (format === "json") {
    return NextResponse.json({
      countries: EU_COUNTRIES,
      total: EU_COUNTRIES.length,
      totalSMEs,
      totalEmployees,
    });
  }

  // GeoJSON format — return country centroids as points with market data
  const features = EU_COUNTRIES.map((c) => {
    const center = EU_COUNTRY_CENTERS[c.code] ?? { lat: 50, lng: 10 };
    const revenue = calculateCountryRevenue(c.smeCount);
    return {
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [center.lng, center.lat] },
      properties: {
        code: c.code,
        name: c.name,
        smeCount: c.smeCount,
        population: c.population,
        gdpEur: c.gdpEur,
        marketScore: c.marketScore,
        region: c.region,
        smeEmployees: c.smeEmployees,
        potentialRevenueEUR: revenue.potentialRevenueEUR,
        addressableRate: revenue.addressableRate,
        formattedRevenue: revenue.formattedRevenue,
      },
    };
  });

  return NextResponse.json({ type: "FeatureCollection", features });
}
