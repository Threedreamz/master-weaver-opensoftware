import type { SearchIntelligenceData } from "./search-intelligence-data";

// ==================== Dashboard ====================

export function computeDashboardKpis(data: SearchIntelligenceData) {
  const snapshot = data.domainSnapshot;
  if (!snapshot) return null;

  const totalOrganic = data.organicKeywords.filter((k) => (k.organicPosition ?? 99) <= 10).length;
  const totalPaid = data.paidKeywords.length;
  const overlap = data.overlappingKeywords.length;
  const overlapPercent = totalOrganic + totalPaid > 0
    ? Math.round((overlap / (totalOrganic + totalPaid)) * 100)
    : 0;

  return {
    serpDominanceScore: snapshot.authorityScore,
    organicKeywordsTop10: totalOrganic,
    paidKeywordsActive: totalPaid,
    keywordOverlapPercent: overlapPercent,
  };
}

// ==================== Keyword Bridge ====================

export interface BridgeRecommendation {
  keyword: string;
  organicPosition: number | null;
  paidActive: boolean;
  searchVolume: number;
  cpc: number;
  action: "create_campaign" | "increase_bid" | "reduce_budget" | "pause_campaign";
  priority: "high" | "medium" | "low";
}

export function computeKeywordBridge(data: SearchIntelligenceData): BridgeRecommendation[] {
  const recommendations: BridgeRecommendation[] = [];

  for (const kw of data.organicKeywords) {
    const hasPaid = data.paidKeywords.some((p) => p.keyword === kw.keyword);
    if (!hasPaid && (kw.organicPosition ?? 99) <= 10 && kw.searchVolume >= 100) {
      recommendations.push({
        keyword: kw.keyword,
        organicPosition: kw.organicPosition,
        paidActive: false,
        searchVolume: kw.searchVolume,
        cpc: kw.cpc,
        action: "create_campaign",
        priority: kw.searchVolume >= 500 ? "high" : "medium",
      });
    }
  }

  for (const kw of data.overlappingKeywords) {
    if ((kw.organicPosition ?? 99) <= 3) {
      recommendations.push({
        keyword: kw.keyword,
        organicPosition: kw.organicPosition,
        paidActive: true,
        searchVolume: kw.searchVolume,
        cpc: kw.cpc,
        action: "reduce_budget",
        priority: "low",
      });
    }
  }

  return recommendations.sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });
}

// ==================== Cannibalization ====================

export interface CannibalizationRow {
  keyword: string;
  organicPosition: number | null;
  paidPosition: number | null;
  searchVolume: number;
  cpc: number;
  impressionShare: number;
  monthlyBudget: number;
  status: "critical" | "warning" | "ok";
  action: string;
}

export function computeCannibalization(data: SearchIntelligenceData): CannibalizationRow[] {
  return data.overlappingKeywords.map((kw) => {
    const orgPos = kw.organicPosition ?? 99;
    const paidPos = kw.paidPosition ?? 99;
    const impressionShare = orgPos <= 3 ? 0.8 + Math.random() * 0.15 : 0.4 + Math.random() * 0.3;
    const monthlyBudget = kw.cpc * kw.traffic * 0.3;

    let status: "critical" | "warning" | "ok" = "ok";
    let action = "No action needed";

    if (orgPos <= 3 && paidPos <= 3) {
      status = "critical";
      action = "Pause paid campaign";
    } else if (orgPos <= 5 && paidPos <= 5) {
      status = "warning";
      action = "Review paid spend";
    }

    return {
      keyword: kw.keyword,
      organicPosition: kw.organicPosition,
      paidPosition: kw.paidPosition,
      searchVolume: kw.searchVolume,
      cpc: kw.cpc,
      impressionShare: Math.round(impressionShare * 100),
      monthlyBudget: Math.round(monthlyBudget),
      status,
      action,
    };
  }).sort((a, b) => {
    const p = { critical: 0, warning: 1, ok: 2 };
    return p[a.status] - p[b.status];
  });
}

// ==================== Recommendations ====================

export function computeRecommendations(data: SearchIntelligenceData) {
  const recommendations: Array<{
    type: string;
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    impact: string;
  }> = [];

  const cannibalised = data.overlappingKeywords.filter(
    (k) => (k.organicPosition ?? 99) <= 3 && (k.paidPosition ?? 99) <= 3,
  );
  if (cannibalised.length > 0) {
    recommendations.push({
      type: "cannibalization",
      priority: "high",
      title: `${cannibalised.length} keywords with SEO/SEA cannibalization`,
      description: `${cannibalised.length} keywords rank organically in top 3 while having active paid campaigns.`,
      impact: `Potential savings: ~${cannibalised.reduce((s, k) => s + k.cpc * k.traffic * 0.3, 0).toFixed(0)} EUR/mo.`,
    });
  }

  const waste = data.searchTerms.filter((st) => st.status === "waste");
  if (waste.length > 0) {
    const wastedBudget = waste.reduce((s, st) => s + st.cost, 0);
    recommendations.push({
      type: "negative_keywords",
      priority: wastedBudget > 100 ? "high" : "medium",
      title: `${waste.length} search terms suggested as negative keywords`,
      description: `${waste.length} search terms with spend but no conversions identified.`,
      impact: `-${(wastedBudget / 100).toFixed(0)} EUR wasted budget/mo.`,
    });
  }

  const bridge = computeKeywordBridge(data);
  const highPriority = bridge.filter((b) => b.priority === "high");
  if (highPriority.length > 0) {
    recommendations.push({
      type: "keyword_bridge",
      priority: "medium",
      title: `${highPriority.length} new high-potential keywords`,
      description: `${highPriority.length} organic top-keywords without active paid campaigns.`,
      impact: `+${highPriority.reduce((s, k) => s + k.searchVolume, 0)} potential impressions/mo.`,
    });
  }

  return recommendations.sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });
}
