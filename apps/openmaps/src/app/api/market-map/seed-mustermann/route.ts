import { NextResponse } from "next/server";
import { MUSTERMANN_GMBH } from "@/lib/market-map/seed-mustermann";
import { addLead, getLeadsStore } from "../leads/_store";

export async function POST() {
  const existing = getLeadsStore().find(
    (l) => l.vatId === MUSTERMANN_GMBH.vatId || l.companyName === MUSTERMANN_GMBH.companyName
  );

  if (existing) {
    return NextResponse.json({ message: "Mustermann GmbH already exists", lead: existing });
  }

  const lead = addLead({
    vatId: MUSTERMANN_GMBH.vatId,
    companyName: MUSTERMANN_GMBH.companyName,
    legalForm: MUSTERMANN_GMBH.legalForm,
    countryCode: MUSTERMANN_GMBH.countryCode,
    postalCode: MUSTERMANN_GMBH.postalCode,
    city: MUSTERMANN_GMBH.city,
    street: MUSTERMANN_GMBH.street,
    website: MUSTERMANN_GMBH.website,
    domain: MUSTERMANN_GMBH.domain,
    industry: MUSTERMANN_GMBH.industry,
    employeesRange: `${MUSTERMANN_GMBH.employeesMin}-${MUSTERMANN_GMBH.employeesMax}`,
    revenueRange: `${MUSTERMANN_GMBH.revenueMin}-${MUSTERMANN_GMBH.revenueMax}`,
    registerNumber: MUSTERMANN_GMBH.registerNumber,
    registerCourt: MUSTERMANN_GMBH.registerCourt,
    creditScore: MUSTERMANN_GMBH.creditScore,
    creditRating: MUSTERMANN_GMBH.creditRating,
    insolvencyRisk: MUSTERMANN_GMBH.insolvencyRisk === 1,
    latitude: MUSTERMANN_GMBH.latitude,
    longitude: MUSTERMANN_GMBH.longitude,
    enrichmentStatus: MUSTERMANN_GMBH.enrichmentStatus,
    leadScore: MUSTERMANN_GMBH.leadScore,
    leadStatus: MUSTERMANN_GMBH.leadStatus,
    source: MUSTERMANN_GMBH.source,
    tags: MUSTERMANN_GMBH.tags,
    notes: MUSTERMANN_GMBH.notes,
  });

  return NextResponse.json({ message: "Mustermann GmbH created", lead }, { status: 201 });
}

export async function GET() {
  const mustermann = getLeadsStore().find(
    (l) => l.vatId === "DE123456789" || l.companyName === "Mustermann GmbH"
  );

  if (!mustermann) {
    return NextResponse.json(
      { message: "Mustermann GmbH not found. POST to seed it." },
      { status: 404 }
    );
  }

  return NextResponse.json({ lead: mustermann });
}
