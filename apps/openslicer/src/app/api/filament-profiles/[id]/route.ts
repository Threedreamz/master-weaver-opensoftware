import { NextResponse } from "next/server";
import {
  getFilamentProfileById,
  updateFilamentProfile,
  deleteFilamentProfile,
} from "../../../../db/queries/filament-profiles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = getFilamentProfileById(id);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    console.error("Failed to fetch filament profile:", err);
    return NextResponse.json(
      { error: "Failed to fetch filament profile" },
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
    const profile = updateFilamentProfile(id, body);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    console.error("Failed to update filament profile:", err);
    return NextResponse.json(
      { error: "Failed to update filament profile" },
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
    deleteFilamentProfile(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete filament profile:", err);
    return NextResponse.json(
      { error: "Failed to delete filament profile" },
      { status: 500 }
    );
  }
}
