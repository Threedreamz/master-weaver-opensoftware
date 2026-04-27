import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "open3dreel",
    timestamp: new Date().toISOString(),
  });
}
