import { NextResponse } from "next/server";

/**
 * GET /api/demo/seed
 *
 * Generates the demo overhang STL and seeds the database with a model record
 * and default slicer profiles (legacy, printer, filament, process).
 * Idempotent — every insert checks for an existing row by name first.
 *
 * Delegates to the same seedDemo() function that instrumentation.ts runs at
 * container boot, so manually hitting this endpoint and the automatic boot
 * seed produce identical state.
 */
export async function GET() {
  try {
    const { seedDemo } = await import("@/lib/seed/seed-demo");
    const result = await seedDemo();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
