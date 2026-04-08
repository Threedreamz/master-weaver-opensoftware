import { NextResponse } from "next/server";
import { pack3D, type PackingItem } from "@opensoftware/slicer-core";

interface PackingRequestItem {
  modelId: string;
  quantity: number;
  width?: number;
  depth?: number;
  height?: number;
}

interface PackingRequestBody {
  items: PackingRequestItem[];
  buildVolume: { x: number; y: number; z: number };
  gap?: number;
}

export async function POST(request: Request) {
  try {
    const body: PackingRequestBody = await request.json();
    const { items, buildVolume, gap } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items array is required" },
        { status: 400 }
      );
    }

    if (!buildVolume || !buildVolume.x || !buildVolume.y || !buildVolume.z) {
      return NextResponse.json(
        { error: "buildVolume with x, y, z is required" },
        { status: 400 }
      );
    }

    // Convert request items to PackingItems
    // Use provided dimensions or defaults
    const packingItems: PackingItem[] = items.map((item) => ({
      id: item.modelId,
      width: item.width ?? 30,
      depth: item.depth ?? 30,
      height: item.height ?? 30,
      quantity: item.quantity,
    }));

    const result = pack3D(packingItems, buildVolume, {
      gap: gap ?? 3,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
