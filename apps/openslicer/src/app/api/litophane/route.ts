import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Not implemented — litophane generator not yet connected" },
    { status: 501 }
  );
}
