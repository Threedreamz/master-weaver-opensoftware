import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "opensimulation",
    version: "1.0.0",
    uptimeSec: Math.floor(process.uptime()),
  });
}
