import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/jobs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    modelFilename,
    modelFormat,
    durationS,
    rotation,
    lighting,
    aspect,
    bgColor,
    musicTrackUrl,
    watermarkEnabled,
    zoom,
  } = body as Record<string, unknown>;

  if (typeof modelFilename !== "string" || typeof modelFormat !== "string") {
    return NextResponse.json(
      { error: "modelFilename and modelFormat are required" },
      { status: 400 },
    );
  }
  if (!["stl", "obj", "gltf", "glb"].includes(modelFormat as string)) {
    return NextResponse.json({ error: "Unsupported modelFormat" }, { status: 400 });
  }

  try {
    const job = await createJob({
      modelFilename,
      modelFormat: modelFormat as "stl" | "obj" | "gltf" | "glb",
      durationS: typeof durationS === "number" ? durationS : 15,
      rotation: (rotation as "turntable" | "orbit" | "oscillate") ?? "turntable",
      lighting: (lighting as "product" | "studio" | "dramatic" | "neon") ?? "product",
      aspect: (aspect as "9:16" | "1:1" | "16:9") ?? "9:16",
      bgColor: typeof bgColor === "string" ? bgColor : "#0a0a0f",
      musicTrackUrl: typeof musicTrackUrl === "string" ? musicTrackUrl : null,
      watermarkEnabled: watermarkEnabled !== false,
      zoom: (zoom as "near" | "medium" | "far") ?? "medium",
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    console.error("[open3dreel] createJob error:", err);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
