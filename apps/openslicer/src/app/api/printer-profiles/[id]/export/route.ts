import { NextResponse } from "next/server";
import { getPrinterProfileById } from "../../../../../db/queries/printer-profiles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = getPrinterProfileById(id);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Strip internal fields for export
    const { id: _id, createdAt, updatedAt, ...settings } = profile as Record<string, unknown>;
    const exportData = {
      type: "printer" as const,
      name: profile.name,
      version: 1,
      settings,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${profile.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_printer.json"`,
      },
    });
  } catch (err) {
    console.error("Failed to export printer profile:", err);
    return NextResponse.json(
      { error: "Failed to export printer profile" },
      { status: 500 }
    );
  }
}
