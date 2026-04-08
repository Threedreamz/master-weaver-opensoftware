import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "opensoftware-gateway",
    timestamp: new Date().toISOString(),
  });
}
