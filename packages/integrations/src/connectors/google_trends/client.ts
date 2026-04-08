// ==================== Google Trends Client ====================
// Uses the unofficial Google Trends API endpoints (no auth required).
// These endpoints may change without notice — handle errors gracefully.

import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type {
  GoogleTrendsClientConfig,
  InterestOverTimeParams,
  InterestOverTimeResult,
  InterestTimePoint,
  RelatedQueriesParams,
  RelatedQueriesResult,
  RelatedQuery,
  RelatedTopicsParams,
  RelatedTopicsResult,
  RelatedTopic,
  InterestByRegionParams,
  InterestByRegionResult,
  RegionInterest,
} from "./types.js";

/**
 * Google Trends client using the unofficial widget API.
 *
 * Flow: First call /api/explore to get widget tokens, then use those
 * tokens to fetch actual data from /api/widgetdata endpoints.
 */
export class GoogleTrendsClient extends BaseIntegrationClient {
  private defaultGeo: string;
  private defaultHl: string;

  constructor(config: GoogleTrendsClientConfig = {}) {
    super({
      baseUrl: "https://trends.google.com",
      authType: "none",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
      defaultHeaders: {
        "Accept-Language": config.defaultHl ?? "en-US",
      },
    });
    this.defaultGeo = config.defaultGeo ?? "";
    this.defaultHl = config.defaultHl ?? "en-US";
  }

  // ==================== Interest Over Time ====================

  /** Get interest over time for one or more keywords */
  async getInterestOverTime(
    params: InterestOverTimeParams
  ): Promise<InterestOverTimeResult> {
    const { keywords } = params;
    if (keywords.length === 0 || keywords.length > 5) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        "Must provide between 1 and 5 keywords"
      );
    }

    const geo = params.geo ?? this.defaultGeo;
    const timeRange = params.customDateRange ?? params.timeRange ?? "today 12-m";

    const widgets = await this.getExploreWidgets(keywords, {
      time: timeRange,
      geo,
      category: params.category,
      property: params.property,
    });

    const timeWidget = widgets.find((w: ExploreWidget) => w.id === "TIMESERIES");
    if (!timeWidget) {
      throw new IntegrationError("UNKNOWN", "No timeseries widget found in explore response");
    }

    const data = await this.getWidgetData<TimeseriesRawResponse>(
      "/api/widgetdata/multiline",
      timeWidget.token,
      timeWidget.request
    );

    const timeline: InterestTimePoint[] =
      data.default.timelineData.map((point) => {
        const values: Record<string, number> = {};
        keywords.forEach((kw, i) => {
          values[kw] = point.value[i] ?? 0;
        });
        return {
          date: point.formattedTime,
          timestamp: Number(point.time),
          values,
          isPartial: point.isPartial ?? false,
        };
      });

    const averages: Record<string, number> = {};
    for (const kw of keywords) {
      const vals = timeline.map((t) => t.values[kw] ?? 0);
      averages[kw] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }

    return {
      keywords,
      timeRange: String(timeRange),
      geo,
      timeline,
      averages,
    };
  }

  // ==================== Related Queries ====================

  /** Get related search queries for a keyword */
  async getRelatedQueries(
    params: RelatedQueriesParams
  ): Promise<RelatedQueriesResult> {
    const geo = params.geo ?? this.defaultGeo;
    const timeRange = params.customDateRange ?? params.timeRange ?? "today 12-m";

    const widgets = await this.getExploreWidgets([params.keyword], {
      time: timeRange,
      geo,
      category: params.category,
      property: params.property,
    });

    const queryWidget = widgets.find((w: ExploreWidget) => w.id === "RELATED_QUERIES");
    if (!queryWidget) {
      throw new IntegrationError("UNKNOWN", "No related queries widget found");
    }

    const data = await this.getWidgetData<RelatedRawResponse>(
      "/api/widgetdata/relatedsearches",
      queryWidget.token,
      queryWidget.request
    );

    const parseQueries = (
      items: RelatedRawItem[] | undefined
    ): RelatedQuery[] =>
      (items ?? []).map((item) => ({
        query: item.query,
        value: item.value,
        formattedValue: item.formattedValue,
        link: item.link ? `https://trends.google.com${item.link}` : undefined,
      }));

    return {
      keyword: params.keyword,
      top: parseQueries(data.default.rankedList?.[0]?.rankedKeyword),
      rising: parseQueries(data.default.rankedList?.[1]?.rankedKeyword),
    };
  }

  // ==================== Related Topics ====================

  /** Get related topics for a keyword */
  async getRelatedTopics(
    params: RelatedTopicsParams
  ): Promise<RelatedTopicsResult> {
    const geo = params.geo ?? this.defaultGeo;
    const timeRange = params.customDateRange ?? params.timeRange ?? "today 12-m";

    const widgets = await this.getExploreWidgets([params.keyword], {
      time: timeRange,
      geo,
      category: params.category,
      property: params.property,
    });

    const topicWidget = widgets.find((w: ExploreWidget) => w.id === "RELATED_TOPICS");
    if (!topicWidget) {
      throw new IntegrationError("UNKNOWN", "No related topics widget found");
    }

    const data = await this.getWidgetData<RelatedTopicsRawResponse>(
      "/api/widgetdata/relatedsearches",
      topicWidget.token,
      topicWidget.request
    );

    const parseTopics = (
      items: RelatedTopicRawItem[] | undefined
    ): RelatedTopic[] =>
      (items ?? []).map((item) => ({
        title: item.topic.title,
        type: item.topic.type,
        value: item.value,
        formattedValue: item.formattedValue,
        topicMid: item.topic.mid,
        link: item.link ? `https://trends.google.com${item.link}` : undefined,
      }));

    return {
      keyword: params.keyword,
      top: parseTopics(data.default.rankedList?.[0]?.rankedKeyword),
      rising: parseTopics(data.default.rankedList?.[1]?.rankedKeyword),
    };
  }

  // ==================== Interest by Region ====================

  /** Get interest by geographic region */
  async getInterestByRegion(
    params: InterestByRegionParams
  ): Promise<InterestByRegionResult> {
    const geo = params.geo ?? this.defaultGeo;
    const timeRange = params.timeRange ?? "today 12-m";

    const widgets = await this.getExploreWidgets([params.keyword], {
      time: timeRange,
      geo,
    });

    const geoWidget = widgets.find((w: ExploreWidget) => w.id === "GEO_MAP");
    if (!geoWidget) {
      throw new IntegrationError("UNKNOWN", "No geo map widget found");
    }

    // Override resolution if specified
    if (params.resolution) {
      geoWidget.request.resolution = params.resolution;
    }

    const data = await this.getWidgetData<GeoMapRawResponse>(
      "/api/widgetdata/comparedgeo",
      geoWidget.token,
      geoWidget.request
    );

    const regions: RegionInterest[] =
      data.default.geoMapData.map((item) => ({
        geoName: item.geoName,
        geoCode: item.geoCode,
        value: item.value[0] ?? 0,
      }));

    return {
      keyword: params.keyword,
      geo,
      resolution: params.resolution ?? "COUNTRY",
      regions,
    };
  }

  // ==================== Connection Test ====================

  /** Test connectivity by running a simple trends query */
  async testConnection(): Promise<boolean> {
    try {
      await this.getInterestOverTime({
        keywords: ["test"],
        timeRange: "now 1-H",
      });
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Private: Explore API ====================

  /**
   * Fetch explore widgets (tokens) for given keywords and options.
   * The explore endpoint returns widget configs with tokens needed
   * to fetch actual data.
   */
  private async getExploreWidgets(
    keywords: string[],
    options: {
      time: string;
      geo: string;
      category?: number;
      property?: string;
    }
  ): Promise<ExploreWidget[]> {
    const comparisonItem = keywords.map((keyword) => ({
      keyword,
      geo: options.geo,
      time: options.time,
    }));

    const req = {
      comparisonItem,
      category: options.category ?? 0,
      property: options.property ?? "",
    };

    const response = await this.get<string>("/api/explore", {
      hl: this.defaultHl,
      tz: "-60",
      req: JSON.stringify(req),
    });

    // The response begins with ")]}',\n" which needs to be stripped
    const raw = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    const cleaned = raw.replace(/^\)\]\}',?\n?/, "");

    try {
      const parsed = JSON.parse(cleaned) as { widgets: ExploreWidget[] };
      return parsed.widgets;
    } catch {
      throw new IntegrationError(
        "UNKNOWN",
        "Failed to parse Google Trends explore response"
      );
    }
  }

  /**
   * Fetch widget data using a token from the explore API.
   */
  private async getWidgetData<T>(
    endpoint: string,
    token: string,
    widgetRequest: unknown
  ): Promise<T> {
    const response = await this.get<string>(endpoint, {
      hl: this.defaultHl,
      tz: "-60",
      token,
      req: JSON.stringify(widgetRequest),
    });

    const raw = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    const cleaned = raw.replace(/^\)\]\}',?\n?/, "");

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new IntegrationError(
        "UNKNOWN",
        "Failed to parse Google Trends widget data response"
      );
    }
  }
}

// ==================== Internal Raw Types ====================

interface ExploreWidget {
  id: string;
  token: string;
  request: Record<string, unknown> & { resolution?: string };
}

interface TimeseriesRawResponse {
  default: {
    timelineData: Array<{
      time: string;
      formattedTime: string;
      value: number[];
      isPartial?: boolean;
    }>;
  };
}

interface RelatedRawItem {
  query: string;
  value: number;
  formattedValue: string;
  link?: string;
}

interface RelatedRawResponse {
  default: {
    rankedList?: Array<{
      rankedKeyword?: RelatedRawItem[];
    }>;
  };
}

interface RelatedTopicRawItem {
  topic: {
    title: string;
    type: string;
    mid?: string;
  };
  value: number;
  formattedValue: string;
  link?: string;
}

interface RelatedTopicsRawResponse {
  default: {
    rankedList?: Array<{
      rankedKeyword?: RelatedTopicRawItem[];
    }>;
  };
}

interface GeoMapRawResponse {
  default: {
    geoMapData: Array<{
      geoName: string;
      geoCode: string;
      value: number[];
    }>;
  };
}
