import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "opencad",
    timestamp: new Date().toISOString(),
  });
}
