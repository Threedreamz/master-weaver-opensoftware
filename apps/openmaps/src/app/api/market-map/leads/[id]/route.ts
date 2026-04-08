import { NextResponse } from "next/server";
import { getLeadsStore } from "../_store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = getLeadsStore();
  const lead = store.find(l => l.id === Number(id));

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(lead);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = getLeadsStore();
  const index = store.findIndex(l => l.id === Number(id));

  if (index === -1) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const updated = { ...store[index], ...body, updatedAt: new Date().toISOString() };
  store[index] = updated;

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = getLeadsStore();
  const index = store.findIndex(l => l.id === Number(id));

  if (index === -1) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  store.splice(index, 1);
  return NextResponse.json({ deleted: true });
}
