import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "openaccounting",
    timestamp: new Date().toISOString(),
  });
}
