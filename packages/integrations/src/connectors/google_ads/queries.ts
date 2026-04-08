/**
 * Google Ads Query Language (GAQL) builders for common report types.
 * These return query strings to be passed to GoogleAdsClient.search().
 */

export function buildCampaignQuery(dateRange: { from: string; to: string }): string {
  return `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.bidding_strategy_type,
      campaign_budget.amount_micros,
      campaign_budget.type,
      campaign.network_settings.target_google_search,
      campaign.start_date,
      campaign.end_date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${dateRange.from}' AND '${dateRange.to}'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
  `.trim();
}

export function buildKeywordQuery(dateRange: { from: string; to: string }): string {
  return `
    SELECT
      ad_group_criterion.criterion_id,
      ad_group.id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      ad_group_criterion.quality_info.quality_score,
      ad_group_criterion.quality_info.creative_quality_score,
      ad_group_criterion.quality_info.post_click_quality_score,
      ad_group_criterion.quality_info.search_predicted_ctr,
      metrics.average_cpc,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM keyword_view
    WHERE segments.date BETWEEN '${dateRange.from}' AND '${dateRange.to}'
      AND ad_group_criterion.status != 'REMOVED'
    ORDER BY metrics.impressions DESC
  `.trim();
}

export function buildSearchTermQuery(dateRange: { from: string; to: string }): string {
  return `
    SELECT
      search_term_view.search_term,
      search_term_view.ad_group,
      segments.keyword.info.text,
      segments.keyword.info.match_type,
      campaign.id,
      ad_group.id,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM search_term_view
    WHERE segments.date BETWEEN '${dateRange.from}' AND '${dateRange.to}'
    ORDER BY metrics.cost_micros DESC
    LIMIT 1000
  `.trim();
}

export function buildGeoQuery(dateRange: { from: string; to: string }): string {
  return `
    SELECT
      geographic_view.country_criterion_id,
      geographic_view.location_type,
      campaign.id,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM geographic_view
    WHERE segments.date BETWEEN '${dateRange.from}' AND '${dateRange.to}'
    ORDER BY metrics.impressions DESC
  `.trim();
}

export function buildDeviceQuery(dateRange: { from: string; to: string }): string {
  return `
    SELECT
      segments.device,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc,
      metrics.conversions_from_interactions_rate
    FROM campaign
    WHERE segments.date BETWEEN '${dateRange.from}' AND '${dateRange.to}'
      AND campaign.status = 'ENABLED'
  `.trim();
}

export function buildHourlyQuery(dateRange: { from: string; to: string }): string {
  return `
    SELECT
      segments.hour,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${dateRange.from}' AND '${dateRange.to}'
      AND campaign.status = 'ENABLED'
  `.trim();
}

export function buildDailyQuery(dateRange: { from: string; to: string }): string {
  return `
    SELECT
      segments.date,
      campaign.id,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${dateRange.from}' AND '${dateRange.to}'
    ORDER BY segments.date DESC
  `.trim();
}

export function buildAssetQuery(): string {
  return `
    SELECT
      asset.id,
      asset.name,
      asset.type,
      asset_field_type_view.field_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM asset_group_asset
    WHERE asset.type IN ('TEXT', 'IMAGE', 'YOUTUBE_VIDEO')
    ORDER BY metrics.impressions DESC
  `.trim();
}
