import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  NotionClientConfig,
  NotionPage,
  NotionDatabase,
  NotionListResponse,
  NotionQueryDatabaseParams,
  NotionCreatePageInput,
  NotionUpdatePageInput,
  NotionPropertyValue,
  NotionRichText,
} from "./types.js";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

/**
 * Notion API client for OpenFlow form integrations.
 *
 * Creates pages in databases, queries databases, and updates pages.
 * Uses OAuth2 authentication (or internal integration token).
 */
export class NotionClient extends BaseIntegrationClient {
  constructor(config: NotionClientConfig) {
    super({
      baseUrl: NOTION_API_BASE,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 3 },
      defaultHeaders: {
        "Notion-Version": NOTION_VERSION,
      },
    });
  }

  // ==================== Database Operations ====================

  /** Retrieve a database by ID. */
  async getDatabase(
    databaseId: string
  ): Promise<ApiResponse<NotionDatabase>> {
    return this.get<NotionDatabase>(`/databases/${databaseId}`);
  }

  /** Query a database with optional filters, sorts, and pagination. */
  async queryDatabase(
    databaseId: string,
    params?: NotionQueryDatabaseParams
  ): Promise<ApiResponse<NotionListResponse<NotionPage>>> {
    return this.post<NotionListResponse<NotionPage>>(
      `/databases/${databaseId}/query`,
      params ?? {}
    );
  }

  /**
   * Query all pages from a database, automatically handling pagination.
   * Use with caution on large databases — returns all matching results.
   */
  async queryAllPages(
    databaseId: string,
    params?: Omit<NotionQueryDatabaseParams, "start_cursor">
  ): Promise<NotionPage[]> {
    const allPages: NotionPage[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await this.queryDatabase(databaseId, {
        ...params,
        start_cursor: cursor,
        page_size: 100,
      });

      allPages.push(...response.data.results);
      hasMore = response.data.has_more;
      cursor = response.data.next_cursor ?? undefined;
    }

    return allPages;
  }

  // ==================== Page Operations ====================

  /** Retrieve a page by ID. */
  async getPage(pageId: string): Promise<ApiResponse<NotionPage>> {
    return this.get<NotionPage>(`/pages/${pageId}`);
  }

  /** Create a new page in a database. */
  async createPage(
    input: NotionCreatePageInput
  ): Promise<ApiResponse<NotionPage>> {
    return this.post<NotionPage>("/pages", {
      parent: { database_id: input.databaseId },
      properties: input.properties,
    });
  }

  /** Update an existing page's properties. */
  async updatePage(
    pageId: string,
    input: NotionUpdatePageInput
  ): Promise<ApiResponse<NotionPage>> {
    const body: Record<string, unknown> = {
      properties: input.properties,
    };
    if (input.archived !== undefined) {
      body.archived = input.archived;
    }
    return this.patch<NotionPage>(`/pages/${pageId}`, body);
  }

  /** Archive (soft-delete) a page. */
  async archivePage(pageId: string): Promise<ApiResponse<NotionPage>> {
    return this.updatePage(pageId, {
      properties: {},
      archived: true,
    });
  }

  // ==================== Search ====================

  /**
   * Search across all pages and databases the integration has access to.
   */
  async search(
    query: string,
    options?: {
      filter?: { property: "object"; value: "page" | "database" };
      sort?: { direction: "ascending" | "descending"; timestamp: "last_edited_time" };
      start_cursor?: string;
      page_size?: number;
    }
  ): Promise<ApiResponse<NotionListResponse<NotionPage | NotionDatabase>>> {
    return this.post<NotionListResponse<NotionPage | NotionDatabase>>(
      "/search",
      {
        query,
        ...options,
      }
    );
  }

  // ==================== OpenFlow Submission Helpers ====================

  /**
   * Create a Notion page from an OpenFlow form submission.
   *
   * @param databaseId - The target Notion database ID.
   * @param fieldMapping - Maps OpenFlow field keys to Notion property names.
   * @param propertyTypes - Maps Notion property names to their expected types.
   * @param submissionData - Key-value pairs from the form submission.
   */
  async createPageFromSubmission(
    databaseId: string,
    fieldMapping: Record<string, string>,
    propertyTypes: Record<string, string>,
    submissionData: Record<string, unknown>
  ): Promise<ApiResponse<NotionPage>> {
    const properties: Record<string, NotionPropertyValue> = {};

    for (const [openFlowField, notionProperty] of Object.entries(fieldMapping)) {
      const value = submissionData[openFlowField];
      if (value === undefined || value === null) continue;

      const propType = propertyTypes[notionProperty] ?? "rich_text";
      const converted = this.convertToNotionProperty(propType, value);
      if (converted) {
        properties[notionProperty] = converted;
      }
    }

    return this.createPage({ databaseId, properties });
  }

  /**
   * Find pages in a database matching a specific property value.
   * Useful for deduplication before creating new entries.
   */
  async findPagesByProperty(
    databaseId: string,
    propertyName: string,
    value: string
  ): Promise<NotionPage[]> {
    const response = await this.queryDatabase(databaseId, {
      filter: {
        property: propertyName,
        rich_text: { equals: value },
      },
      page_size: 10,
    });
    return response.data.results;
  }

  // ==================== Private Helpers ====================

  /**
   * Convert a plain value to the corresponding Notion property format.
   */
  private convertToNotionProperty(
    type: string,
    value: unknown
  ): NotionPropertyValue | null {
    const strValue = String(value);

    switch (type) {
      case "title":
        return {
          type: "title",
          title: [this.createRichText(strValue)],
        };

      case "rich_text":
        return {
          type: "rich_text",
          rich_text: [this.createRichText(strValue)],
        };

      case "number": {
        const num = Number(value);
        if (Number.isNaN(num)) return null;
        return { type: "number", number: num };
      }

      case "select":
        return {
          type: "select",
          select: { name: strValue },
        };

      case "multi_select": {
        const items = Array.isArray(value)
          ? value.map((v) => ({ name: String(v) }))
          : strValue.split(",").map((s) => ({ name: s.trim() }));
        return { type: "multi_select", multi_select: items };
      }

      case "date":
        return {
          type: "date",
          date: { start: strValue },
        };

      case "checkbox":
        return {
          type: "checkbox",
          checkbox: Boolean(value) && value !== "false" && value !== "0",
        };

      case "url":
        return { type: "url", url: strValue };

      case "email":
        return { type: "email", email: strValue };

      case "phone_number":
        return { type: "phone_number", phone_number: strValue };

      case "status":
        return {
          type: "status",
          status: { name: strValue },
        };

      default:
        return {
          type: "rich_text",
          rich_text: [this.createRichText(strValue)],
        };
    }
  }

  /** Create a Notion rich text object from a plain string. */
  private createRichText(content: string): NotionRichText {
    return {
      type: "text",
      text: { content },
    };
  }
}
