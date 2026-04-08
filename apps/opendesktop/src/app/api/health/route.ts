import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "opendesktop",
    timestamp: new Date().toISOString(),
  });
}
