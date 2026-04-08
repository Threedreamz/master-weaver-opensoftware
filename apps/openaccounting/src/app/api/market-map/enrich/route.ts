import { NextResponse } from "next/server";
import { runEnrichmentPipeline } from "@/lib/market-map/enrichment-pipeline";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Request body required" }, { status: 400 });
  }

  const { vatId, companyName, countryCode, domain } = body;

  if (!countryCode) {
    return NextResponse.json({ error: "countryCode is required" }, { status: 400 });
  }

  if (!vatId && !companyName) {
    return NextResponse.json({ error: "Either vatId or companyName is required" }, { status: 400 });
  }

  const result = await runEnrichmentPipeline({
    vatId,
    companyName,
    countryCode,
    domain,
  });

  return NextResponse.json(result);
}
