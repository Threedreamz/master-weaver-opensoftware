/**
 * Seed: OpenSEM — SEO audit and tracked keywords for mustermann.de
 */
import type { DbClient } from "../create-db";
import { mustermannUser, mustermannSeoAudit } from "./mustermann";
import { users } from "../shared.schema";
import { seoAudits, seoKeywords } from "../opensem.schema";

export async function seedOpensem(db: DbClient) {
  // 1. User
  await db.insert(users).values(mustermannUser).onConflictDoNothing();

  // 2. SEO audit for mustermann.de
  await db
    .insert(seoAudits)
    .values({
      url: mustermannSeoAudit.url,
      locale: mustermannSeoAudit.locale,
      overallScore: mustermannSeoAudit.overallScore,
      results: {
        meta: {
          title: { score: 85, value: "Mustermann GmbH — 3D-Druck & CT-Scanner Service Düsseldorf" },
          description: { score: 70, value: "Professioneller 3D-Druck Service und CT-Scanner Wartung in Düsseldorf. Ersatzteile, Prototypen und industrielle Prüftechnik." },
          canonical: { score: 100, value: "https://mustermann.de" },
        },
        headings: {
          h1Count: 1,
          h1Value: "3D-Druck & CT-Scanner Service",
          structure: "OK",
          score: 90,
        },
        performance: {
          loadTimeMs: 2340,
          firstContentfulPaintMs: 1120,
          largestContentfulPaintMs: 2100,
          cumulativeLayoutShift: 0.05,
          score: 68,
        },
        mobile: {
          viewport: true,
          fontSize: true,
          tapTargets: false,
          score: 75,
        },
        indexability: {
          robotsTxt: true,
          sitemap: false,
          noindexPages: 0,
          score: 60,
        },
        links: {
          internal: 24,
          external: 5,
          broken: 1,
          score: 72,
        },
      },
    })
    .onConflictDoNothing();

  // 3. Tracked keywords
  await db.insert(seoKeywords).values([
    {
      keyword: "3d druck düsseldorf",
      locale: "de",
      targetUrl: "https://mustermann.de/3d-druck",
      searchEngine: "google_de" as const,
      tags: ["lokal", "kernleistung"],
      notes: "Hauptkeyword für lokale Sichtbarkeit",
    },
    {
      keyword: "ersatzteil drucken",
      locale: "de",
      targetUrl: "https://mustermann.de/ersatzteile",
      searchEngine: "google_de" as const,
      tags: ["produkt", "long-tail"],
      notes: "Hohe Kaufabsicht, geringer Wettbewerb",
    },
    {
      keyword: "mustermann gmbh",
      locale: "de",
      targetUrl: "https://mustermann.de",
      searchEngine: "google_de" as const,
      tags: ["brand"],
      notes: "Brand-Keyword — Position 1 erwartet",
    },
    {
      keyword: "ct scanner service",
      locale: "de",
      targetUrl: "https://mustermann.de/ct-scanner",
      searchEngine: "google_de" as const,
      tags: ["dienstleistung", "nische"],
      notes: "Nischenkeyword mit B2B-Fokus",
    },
    {
      keyword: "filament kaufen",
      locale: "de",
      targetUrl: "https://mustermann.de/shop/filament",
      searchEngine: "google_de" as const,
      tags: ["shop", "ecommerce"],
      notes: "Transaktionales Keyword für Online-Shop",
    },
  ]).onConflictDoNothing();

  console.log("[seed-opensem] Seeded 1 audit, 5 keywords");
}
