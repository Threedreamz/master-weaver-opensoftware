import { NextResponse } from "next/server";
import { getLeadsStore, addLead } from "./_store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country");
  const minScore = Number(searchParams.get("minScore") ?? 0);
  const status = searchParams.get("status");
  const industry = searchParams.get("industry");
  const search = searchParams.get("search")?.toLowerCase();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  let filtered = [...getLeadsStore()];

  if (country) filtered = filtered.filter(l => l.countryCode === country.toUpperCase());
  if (minScore > 0) filtered = filtered.filter(l => l.leadScore >= minScore);
  if (status) filtered = filtered.filter(l => l.leadStatus === status);
  if (industry) filtered = filtered.filter(l => l.industry?.startsWith(industry));
  if (search) filtered = filtered.filter(l =>
    l.companyName.toLowerCase().includes(search) ||
    l.vatId?.toLowerCase().includes(search) ||
    l.city?.toLowerCase().includes(search)
  );

  filtered.sort((a, b) => b.leadScore - a.leadScore);
  const total = filtered.length;
  const offset = (page - 1) * limit;
  const leads = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    leads,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    filters: {
      countries: [...new Set(getLeadsStore().map(l => l.countryCode))].sort(),
      statuses: [...new Set(getLeadsStore().map(l => l.leadStatus))],
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.companyName || !body?.countryCode) {
    return NextResponse.json({ error: "companyName and countryCode required" }, { status: 400 });
  }

  const store = getLeadsStore();
  if (body.vatId && store.some(l => l.vatId === body.vatId)) {
    return NextResponse.json({ error: "Lead with this VAT ID already exists" }, { status: 409 });
  }

  const lead = addLead({
    companyName: body.companyName,
    countryCode: body.countryCode.toUpperCase(),
    vatId: body.vatId,
    legalForm: body.legalForm,
    postalCode: body.postalCode,
    city: body.city,
    street: body.street,
    website: body.website,
    domain: body.domain,
    industry: body.industry,
    employeesRange: body.employeesRange,
    revenueRange: body.revenueRange,
    registerNumber: body.registerNumber,
    registerCourt: body.registerCourt,
    creditScore: body.creditScore,
    creditRating: body.creditRating,
    insolvencyRisk: body.insolvencyRisk,
    latitude: body.latitude,
    longitude: body.longitude,
    enrichmentStatus: body.enrichmentStatus ?? "pending",
    enrichmentDate: body.enrichmentDate,
    leadScore: body.leadScore ?? 0,
    leadStatus: body.leadStatus ?? "new",
    source: body.source ?? "manual",
    tags: body.tags,
    notes: body.notes,
  });

  return NextResponse.json(lead, { status: 201 });
}
