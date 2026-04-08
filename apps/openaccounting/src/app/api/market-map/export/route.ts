import { NextResponse } from "next/server";
import { getLeadsStore } from "../leads/_store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";
  const country = searchParams.get("country")?.toUpperCase();
  const minScore = Number(searchParams.get("minScore") ?? 0);

  let leads = [...getLeadsStore()];
  if (country) leads = leads.filter(l => l.countryCode === country);
  if (minScore > 0) leads = leads.filter(l => l.leadScore >= minScore);
  leads.sort((a, b) => b.leadScore - a.leadScore);

  if (format === "csv") {
    const headers = ["ID","Company Name","VAT ID","Country","City","Postal Code","Industry","Legal Form","Employees","Revenue Range","Credit Score","Lead Score","Status","Enrichment","Website","Source","Created At"];
    const rows = leads.map(l => [
      l.id, escapeCsv(l.companyName), l.vatId ?? "", l.countryCode, l.city ?? "", l.postalCode ?? "",
      l.industry ?? "", l.legalForm ?? "", l.employeesRange ?? "", l.revenueRange ?? "",
      l.creditScore ?? "", l.leadScore ?? 0, l.leadStatus ?? "new", l.enrichmentStatus ?? "pending",
      l.website ?? "", l.source ?? "", l.createdAt ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="market-leads-${country ?? "all"}-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({ exportedAt: new Date().toISOString(), count: leads.length, leads });
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
