import { NextResponse } from "next/server";
import { db } from "@/db";
import { invArtikel } from "@/db/schema";

export async function GET() {
  try {
    const articles = await db.select().from(invArtikel);
    return NextResponse.json({ articles });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}
