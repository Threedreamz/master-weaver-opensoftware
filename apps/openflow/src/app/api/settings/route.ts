import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { checkApiAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

export async function GET(_request: NextRequest) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const rows = await db.select().from(appSettings);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("[GET /api/settings]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof key !== "string" || typeof value !== "string") {
      return NextResponse.json(
        { error: "key and value are required strings" },
        { status: 400 }
      );
    }

    // Upsert: try to update first, insert if not found
    const existing = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(appSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(appSettings.key, key));
    } else {
      await db.insert(appSettings).values({ key, value });
    }

    return NextResponse.json({ key, value });
  } catch (error) {
    console.error("[POST /api/settings]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
