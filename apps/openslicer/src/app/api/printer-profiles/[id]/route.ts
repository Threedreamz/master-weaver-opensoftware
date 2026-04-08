import { NextResponse } from "next/server";
import {
  getPrinterProfileById,
  updatePrinterProfile,
  deletePrinterProfile,
} from "../../../../db/queries/printer-profiles";

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
    return NextResponse.json(profile);
  } catch (err) {
    console.error("Failed to fetch printer profile:", err);
    return NextResponse.json(
      { error: "Failed to fetch printer profile" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const profile = updatePrinterProfile(id, body);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    console.error("Failed to update printer profile:", err);
    return NextResponse.json(
      { error: "Failed to update printer profile" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    deletePrinterProfile(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete printer profile:", err);
    return NextResponse.json(
      { error: "Failed to delete printer profile" },
      { status: 500 }
    );
  }
}
