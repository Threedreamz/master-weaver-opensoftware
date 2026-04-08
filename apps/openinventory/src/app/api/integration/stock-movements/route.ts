import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { invLagerbewegungen, invArtikel } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { artikelId, typ, menge, referenzTyp, referenzId, notizen } = body;

    if (!artikelId || !typ || menge === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: artikelId, typ, menge" },
        { status: 400 },
      );
    }

    // Get current stock
    const [artikel] = await db
      .select()
      .from(invArtikel)
      .where(eq(invArtikel.id, artikelId));

    if (!artikel) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const bestandVorher = artikel.lagerbestand ?? 0;
    const bestandNachher =
      typ === "zugang" ? bestandVorher + menge : bestandVorher - menge;

    // Create stock movement
    const [movement] = await db
      .insert(invLagerbewegungen)
      .values({
        artikelId,
        typ,
        menge,
        bestandVorher,
        bestandNachher,
        referenzTyp: referenzTyp || "openfarm",
        referenzId: referenzId || null,
        notizen: notizen || null,
      })
      .returning();

    // Update article stock
    await db
      .update(invArtikel)
      .set({ lagerbestand: bestandNachher })
      .where(eq(invArtikel.id, artikelId));

    return NextResponse.json({ movement });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create stock movement" },
      { status: 500 },
    );
  }
}
