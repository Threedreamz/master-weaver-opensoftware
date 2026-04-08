import { NextResponse } from "next/server";
import {
  getProcessProfileById,
  updateProcessProfile,
  deleteProcessProfile,
} from "../../../../db/queries/process-profiles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = getProcessProfileById(id);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    console.error("Failed to fetch process profile:", err);
    return NextResponse.json(
      { error: "Failed to fetch process profile" },
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
    const profile = updateProcessProfile(id, body);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    console.error("Failed to update process profile:", err);
    return NextResponse.json(
      { error: "Failed to update process profile" },
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
    deleteProcessProfile(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete process profile:", err);
    return NextResponse.json(
      { error: "Failed to delete process profile" },
      { status: 500 }
    );
  }
}
