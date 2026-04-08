import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { getFlowById, updateFlow, deleteFlow } from "@/db/queries/flows";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const flow = await getFlowById(id);

    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    return NextResponse.json(flow);
  } catch (error) {
    console.error("[GET /api/flows/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();

    const allowedFields: string[] = ["name", "slug", "description", "settings", "status"];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const flow = await updateFlow(id, updateData as Parameters<typeof updateFlow>[1]);

    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    return NextResponse.json(flow);
  } catch (error) {
    console.error("[PATCH /api/flows/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const flow = await getFlowById(id);

    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    if (flow.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft flows can be deleted" },
        { status: 400 }
      );
    }

    await deleteFlow(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/flows/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
