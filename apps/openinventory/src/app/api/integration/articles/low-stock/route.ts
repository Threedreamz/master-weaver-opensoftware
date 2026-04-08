import { NextResponse } from "next/server";
import { db } from "@/db";
import { invArtikel } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const lowStock = await db
      .select()
      .from(invArtikel)
      .where(sql`${invArtikel.lagerbestand} <= ${invArtikel.mindestbestand}`);
    return NextResponse.json({ articles: lowStock });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch low stock articles" }, { status: 500 });
  }
}
