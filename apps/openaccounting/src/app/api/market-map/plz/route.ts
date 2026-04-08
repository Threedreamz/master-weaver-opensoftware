import { NextResponse } from "next/server";
import { EU_COUNTRIES } from "@/lib/market-map/eu-seed-data";
import { EU_COUNTRY_CENTERS } from "@/lib/market-map/geo-utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.toUpperCase();
  const limit = Math.min(500, Number(searchParams.get("limit") ?? 100));

  if (!country) {
    return NextResponse.json({ error: "country parameter required" }, { status: 400 });
  }

  const seed = EU_COUNTRIES.find(c => c.code === country);
  if (!seed) {
    return NextResponse.json({ error: `Unknown country: ${country}` }, { status: 404 });
  }

  const center = EU_COUNTRY_CENTERS[country];
  if (!center) {
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }

  const spreadFactors: Record<string, number> = {
    DE: 4, FR: 5, ES: 5, IT: 4.5, PL: 4, SE: 7, FI: 7, RO: 3.5,
    NL: 1.5, BE: 1, AT: 2, CZ: 2, HU: 2, PT: 3, GR: 3, BG: 3,
    DK: 2, IE: 2.5, HR: 2, SK: 2, LT: 2, LV: 2, SI: 1, EE: 2,
    CY: 0.8, LU: 0.3, MT: 0.2,
  };
  const spread = spreadFactors[country] ?? 3;

  const features = [];
  const gridSize = Math.min(Math.ceil(Math.sqrt(limit)), 15);
  const step = spread / gridSize;
  const avgSMEs = Math.round(seed.smeCount / (gridSize * gridSize));
  let plzCounter = 10000;

  for (let i = 0; i < gridSize && features.length < limit; i++) {
    for (let j = 0; j < gridSize && features.length < limit; j++) {
      const lat = center.lat - spread / 2 + i * step + (Math.random() - 0.5) * step * 0.5;
      const lng = center.lng - spread / 2 + j * step + (Math.random() - 0.5) * step * 0.5;
      const distFromCenter = Math.sqrt((i - gridSize / 2) ** 2 + (j - gridSize / 2) ** 2);
      const density = Math.max(0.2, 1 - distFromCenter / gridSize);
      const smeCount = Math.round(avgSMEs * density * (0.5 + Math.random()));
      const marketScore = Math.round(40 + density * 40 + Math.random() * 20);
      const pop = Math.round((seed.population / (gridSize * gridSize)) * density * (0.5 + Math.random()));
      const potentialRevenue = Math.round(smeCount * 0.002 * 18000);

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {
          countryCode: country,
          postalCode: String(plzCounter++),
          cityName: `${country}-${plzCounter}`,
          smeCount,
          marketScore: Math.min(100, marketScore),
          population: pop,
          potentialRevenueEUR: potentialRevenue,
          formattedRevenue: potentialRevenue >= 1000000 ? `€${(potentialRevenue/1000000).toFixed(1)}M` : `€${(potentialRevenue/1000).toFixed(0)}K`,
        },
      });
    }
  }

  return NextResponse.json({ type: "FeatureCollection", features, meta: { country, total: features.length, source: "generated" } });
}
