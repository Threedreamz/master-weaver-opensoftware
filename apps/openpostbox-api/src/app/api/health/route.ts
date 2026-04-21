import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "openpostbox-api",
    timestamp: new Date().toISOString(),
  });
}
