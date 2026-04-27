import { NextRequest, NextResponse } from "next/server";

/**
 * VIES VAT validation proxy — forwards requests to the EU VIES REST API.
 * GET /api/vat-check?country=DE&vat=123456789
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const country = searchParams.get("country")?.toUpperCase();
  const vat = searchParams.get("vat")?.replace(/\s/g, "");

  if (!country || !vat || country.length !== 2) {
    return NextResponse.json({ valid: false, error: "Missing or invalid parameters" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${country}/vat/${vat}`,
      { next: { revalidate: 0 } }
    );

    if (!res.ok) {
      return NextResponse.json({ valid: false, error: "VIES service unavailable" }, { status: 200 });
    }

    const data = await res.json() as {
      isValid?: boolean;
      name?: string;
      address?: string;
      requestDate?: string;
    };

    return NextResponse.json({
      valid: data.isValid ?? false,
      name: data.name ?? undefined,
      address: data.address ?? undefined,
    });
  } catch {
    return NextResponse.json({ valid: false, error: "VIES request failed" }, { status: 200 });
  }
}
