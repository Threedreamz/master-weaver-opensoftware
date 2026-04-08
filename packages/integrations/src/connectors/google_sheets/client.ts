import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  GoogleSheetsClientConfig,
  GoogleSpreadsheet,
  GoogleValueRange,
  GoogleAppendResult,
  GoogleUpdateResult,
  GoogleCreateSpreadsheetInput,
  GoogleSheetsAppendParams,
  SpreadsheetProperties,
} from "./types.js";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4";

/**
 * Google Sheets API v4 client for OpenFlow form integrations.
 *
 * Appends form submission rows, reads spreadsheet data, and creates
 * new spreadsheets. Uses OAuth2 authentication.
 */
export class GoogleSheetsClient extends BaseIntegrationClient {
  constructor(config: GoogleSheetsClientConfig) {
    super({
      baseUrl: SHEETS_API_BASE,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });
  }

  // ==================== Spreadsheet Operations ====================

  /** Get spreadsheet metadata (sheets, properties). */
  async getSpreadsheet(
    spreadsheetId: string
  ): Promise<ApiResponse<GoogleSpreadsheet>> {
    return this.get<GoogleSpreadsheet>(
      `/spreadsheets/${spreadsheetId}`
    );
  }

  /** Create a new spreadsheet. */
  async createSpreadsheet(
    input: GoogleCreateSpreadsheetInput
  ): Promise<ApiResponse<GoogleSpreadsheet>> {
    const body: Record<string, unknown> = {
      properties: {
        title: input.title,
        locale: input.locale,
        timeZone: input.timeZone,
      } satisfies Partial<SpreadsheetProperties>,
    };

    if (input.sheetTitles?.length) {
      body.sheets = input.sheetTitles.map((title) => ({
        properties: { title },
      }));
    }

    return this.post<GoogleSpreadsheet>("/spreadsheets", body);
  }

  // ==================== Read Operations ====================

  /** Read values from a range in a spreadsheet. */
  async getValues(
    spreadsheetId: string,
    range: string
  ): Promise<ApiResponse<GoogleValueRange>> {
    const encodedRange = encodeURIComponent(range);
    return this.get<GoogleValueRange>(
      `/spreadsheets/${spreadsheetId}/values/${encodedRange}`
    );
  }

  /** Read values from multiple ranges in a single request. */
  async batchGetValues(
    spreadsheetId: string,
    ranges: string[]
  ): Promise<ApiResponse<{ spreadsheetId: string; valueRanges: GoogleValueRange[] }>> {
    const params: Record<string, string> = {
      ranges: ranges.join(","),
    };
    return this.get<{ spreadsheetId: string; valueRanges: GoogleValueRange[] }>(
      `/spreadsheets/${spreadsheetId}/values:batchGet`,
      params
    );
  }

  // ==================== Write Operations ====================

  /** Append rows to the end of a detected table in a range. */
  async appendValues(
    params: GoogleSheetsAppendParams
  ): Promise<ApiResponse<GoogleAppendResult>> {
    const encodedRange = encodeURIComponent(params.range);
    const valueInputOption = params.valueInputOption ?? "USER_ENTERED";
    const insertDataOption = params.insertDataOption ?? "INSERT_ROWS";

    return this.post<GoogleAppendResult>(
      `/spreadsheets/${params.spreadsheetId}/values/${encodedRange}:append?valueInputOption=${valueInputOption}&insertDataOption=${insertDataOption}`,
      {
        majorDimension: "ROWS",
        values: params.values,
      }
    );
  }

  /** Update values in a specific range (overwrite). */
  async updateValues(
    spreadsheetId: string,
    range: string,
    values: unknown[][],
    valueInputOption: "RAW" | "USER_ENTERED" = "USER_ENTERED"
  ): Promise<ApiResponse<GoogleUpdateResult>> {
    const encodedRange = encodeURIComponent(range);
    return this.put<GoogleUpdateResult>(
      `/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=${valueInputOption}`,
      {
        majorDimension: "ROWS",
        values,
      }
    );
  }

  /** Clear all values in a range. */
  async clearValues(
    spreadsheetId: string,
    range: string
  ): Promise<ApiResponse<{ spreadsheetId: string; clearedRange: string }>> {
    const encodedRange = encodeURIComponent(range);
    return this.post<{ spreadsheetId: string; clearedRange: string }>(
      `/spreadsheets/${spreadsheetId}/values/${encodedRange}:clear`
    );
  }

  // ==================== OpenFlow Submission Helpers ====================

  /**
   * Append an OpenFlow form submission as a new row in a Google Sheet.
   *
   * @param spreadsheetId - The target spreadsheet ID.
   * @param sheetName - The sheet/tab name (e.g., "Sheet1").
   * @param fieldOrder - Ordered list of OpenFlow field keys that define column order.
   * @param submissionData - Key-value pairs from the form submission.
   * @param includeTimestamp - If true, prepends a timestamp column.
   */
  async appendSubmission(
    spreadsheetId: string,
    sheetName: string,
    fieldOrder: string[],
    submissionData: Record<string, unknown>,
    includeTimestamp = true
  ): Promise<ApiResponse<GoogleAppendResult>> {
    const row: unknown[] = [];

    if (includeTimestamp) {
      row.push(new Date().toISOString());
    }

    for (const key of fieldOrder) {
      const value = submissionData[key];
      row.push(value !== undefined && value !== null ? String(value) : "");
    }

    return this.appendValues({
      spreadsheetId,
      range: sheetName,
      values: [row],
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
    });
  }

  /**
   * Append multiple form submissions as rows in a Google Sheet.
   * More efficient than individual appendSubmission calls — sends one API request.
   */
  async appendSubmissionBatch(
    spreadsheetId: string,
    sheetName: string,
    fieldOrder: string[],
    submissions: Array<Record<string, unknown>>,
    includeTimestamp = true
  ): Promise<ApiResponse<GoogleAppendResult>> {
    const rows: unknown[][] = [];

    for (const submissionData of submissions) {
      const row: unknown[] = [];

      if (includeTimestamp) {
        row.push(new Date().toISOString());
      }

      for (const key of fieldOrder) {
        const value = submissionData[key];
        row.push(value !== undefined && value !== null ? String(value) : "");
      }

      rows.push(row);
    }

    return this.appendValues({
      spreadsheetId,
      range: sheetName,
      values: rows,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
    });
  }

  /**
   * Set up a new spreadsheet for receiving OpenFlow submissions.
   * Creates the spreadsheet and writes a header row.
   */
  async createSubmissionSheet(
    title: string,
    fieldOrder: string[],
    includeTimestamp = true
  ): Promise<{ spreadsheet: GoogleSpreadsheet; headerRange: string }> {
    const createResult = await this.createSpreadsheet({ title });
    const spreadsheet = createResult.data;
    const sheetName = spreadsheet.sheets[0]?.properties.title ?? "Sheet1";

    const headers: string[] = [];
    if (includeTimestamp) {
      headers.push("Timestamp");
    }
    headers.push(...fieldOrder);

    await this.updateValues(
      spreadsheet.spreadsheetId,
      `${sheetName}!A1`,
      [headers],
      "RAW"
    );

    return {
      spreadsheet,
      headerRange: `${sheetName}!A1:${columnLetter(headers.length)}1`,
    };
  }
}

/** Convert a 1-based column index to a letter (1=A, 26=Z, 27=AA, etc.). */
function columnLetter(index: number): string {
  let result = "";
  let n = index;
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}
