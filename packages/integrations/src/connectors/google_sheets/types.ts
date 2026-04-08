// ==================== Google Sheets API v4 Types ====================
// OAuth2 authentication. Append rows, read data, create spreadsheets.

/** Google Sheets spreadsheet properties. */
export interface GoogleSpreadsheet {
  spreadsheetId: string;
  properties: SpreadsheetProperties;
  sheets: GoogleSheet[];
  spreadsheetUrl: string;
}

/** Spreadsheet-level properties. */
export interface SpreadsheetProperties {
  title: string;
  locale?: string;
  autoRecalc?: "ON_CHANGE" | "MINUTE" | "HOUR";
  timeZone?: string;
}

/** A single sheet within a spreadsheet. */
export interface GoogleSheet {
  properties: SheetProperties;
}

/** Sheet-level properties. */
export interface SheetProperties {
  sheetId: number;
  title: string;
  index: number;
  sheetType: "GRID" | "OBJECT" | "DATA_SOURCE";
  gridProperties?: {
    rowCount: number;
    columnCount: number;
    frozenRowCount?: number;
    frozenColumnCount?: number;
  };
}

/** A range of values returned from reading a sheet. */
export interface GoogleValueRange {
  range: string;
  majorDimension: "ROWS" | "COLUMNS";
  values: unknown[][];
}

/** Result of appending rows to a sheet. */
export interface GoogleAppendResult {
  spreadsheetId: string;
  tableRange: string;
  updates: {
    spreadsheetId: string;
    updatedRange: string;
    updatedRows: number;
    updatedColumns: number;
    updatedCells: number;
  };
}

/** Result of updating values in a sheet. */
export interface GoogleUpdateResult {
  spreadsheetId: string;
  updatedRange: string;
  updatedRows: number;
  updatedColumns: number;
  updatedCells: number;
}

/** Input for creating a new spreadsheet. */
export interface GoogleCreateSpreadsheetInput {
  title: string;
  sheetTitles?: string[];
  locale?: string;
  timeZone?: string;
}

/** Parameters for appending rows from an OpenFlow submission. */
export interface GoogleSheetsAppendParams {
  spreadsheetId: string;
  /** Sheet name or range (e.g., "Sheet1" or "Sheet1!A:Z"). */
  range: string;
  /** Rows of values to append. Each inner array is one row. */
  values: unknown[][];
  /** How input should be interpreted. */
  valueInputOption?: "RAW" | "USER_ENTERED";
  /** How rows are inserted. */
  insertDataOption?: "OVERWRITE" | "INSERT_ROWS";
}

/** Configuration for the Google Sheets connector. */
export interface GoogleSheetsClientConfig {
  /** OAuth2 access token. */
  accessToken: string;
  /** Request timeout in ms. */
  timeout?: number;
}
