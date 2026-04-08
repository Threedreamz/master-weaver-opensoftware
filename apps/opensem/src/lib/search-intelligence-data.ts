import { db } from "@/db";
import { eq } from "drizzle-orm";
import {
  searchIntelligenceLinks,
  semrushKeywordData,
  semrushCompetitorData,
  semrushSnapshots,
  semrushDomainHistory,
  paidAdsSearchTerms,
  paidAdsMetricsGeo,
  paidAdsMetricsDevice,
  paidAdsMetricsHour,
  paidAdsKeywords,
  paidAdsAssets,
} from "@/db/schema";

export interface SearchIntelligenceData {
  linkId: number;
  domain: string;
  database: string;
  domainSnapshot: typeof semrushSnapshots.$inferSelect | null;
  domainHistory: (typeof semrushDomainHistory.$inferSelect)[];
  organicKeywords: (typeof semrushKeywordData.$inferSelect)[];
  paidKeywords: (typeof semrushKeywordData.$inferSelect)[];
  overlappingKeywords: (typeof semrushKeywordData.$inferSelect)[];
  competitors: (typeof semrushCompetitorData.$inferSelect)[];
  searchTerms: (typeof paidAdsSearchTerms.$inferSelect)[];
  geoMetrics: (typeof paidAdsMetricsGeo.$inferSelect)[];
  deviceMetrics: (typeof paidAdsMetricsDevice.$inferSelect)[];
  hourMetrics: (typeof paidAdsMetricsHour.$inferSelect)[];
  keywords: (typeof paidAdsKeywords.$inferSelect)[];
  assets: (typeof paidAdsAssets.$inferSelect)[];
}

export async function getSearchIntelligenceData(
  accountId: number,
): Promise<SearchIntelligenceData | null> {
  const link = await db.select().from(searchIntelligenceLinks)
    .where(eq(searchIntelligenceLinks.accountId, accountId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!link) return null;

  const [
    domainSnapshot,
    domainHistoryRows,
    organicKeywords,
    paidKeywords,
    competitors,
    searchTerms,
    geoMetrics,
    deviceMetrics,
    hourMetrics,
    keywords,
    assets,
  ] = await Promise.all([
    db.select().from(semrushSnapshots).where(eq(semrushSnapshots.domain, link.semrushDomain)).limit(1).then((r) => r[0] ?? null),
    db.select().from(semrushDomainHistory).where(eq(semrushDomainHistory.linkId, link.id)).limit(30),
    db.select().from(semrushKeywordData).where(eq(semrushKeywordData.linkId, link.id)),
    db.select().from(semrushKeywordData).where(eq(semrushKeywordData.linkId, link.id)),
    db.select().from(semrushCompetitorData).where(eq(semrushCompetitorData.linkId, link.id)),
    db.select().from(paidAdsSearchTerms).where(eq(paidAdsSearchTerms.accountId, accountId)),
    db.select().from(paidAdsMetricsGeo).where(eq(paidAdsMetricsGeo.accountId, accountId)),
    db.select().from(paidAdsMetricsDevice).where(eq(paidAdsMetricsDevice.accountId, accountId)),
    db.select().from(paidAdsMetricsHour).where(eq(paidAdsMetricsHour.accountId, accountId)),
    db.select().from(paidAdsKeywords).where(eq(paidAdsKeywords.accountId, accountId)),
    db.select().from(paidAdsAssets).where(eq(paidAdsAssets.accountId, accountId)),
  ]);

  const organicOnly = organicKeywords.filter((k) => k.source === "organic");
  const paidOnly = paidKeywords.filter((k) => k.source === "paid");
  const overlapping = organicKeywords.filter((k) => k.source === "both");

  return {
    linkId: link.id,
    domain: link.semrushDomain,
    database: link.semrushDatabase,
    domainSnapshot,
    domainHistory: domainHistoryRows,
    organicKeywords: organicOnly,
    paidKeywords: paidOnly,
    overlappingKeywords: overlapping,
    competitors,
    searchTerms,
    geoMetrics,
    deviceMetrics,
    hourMetrics,
    keywords,
    assets,
  };
}
