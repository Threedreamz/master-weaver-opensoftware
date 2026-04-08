// ==================== Eurostat SDMX REST API Types ====================
// Eurostat structural business statistics (SBS) and related datasets.
// Free public API — no authentication required.
// Base URL: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/

/** Request parameters for SBS (structural business statistics) queries */
export interface EurostatSbsRequest {
  /** Country code (ISO 3166 alpha-2) */
  countryCode: string;
  /** Reference year */
  year?: number;
  /** NACE section code (e.g., "C" for manufacturing) */
  naceSection?: string;
  /** Size class (e.g., "0-9", "10-49", "50-249") */
  sizeClass?: string;
}

/** A single SBS data entry (one country × NACE × size class × year) */
export interface EurostatSbsEntry {
  countryCode: string;
  naceCode: string;
  sizeClass: string;
  year: number;
  enterpriseCount: number;
  employeeCount: number;
  turnoverMillionEur: number;
}

/** Aggregated country summary from SBS data */
export interface EurostatCountrySummary {
  countryCode: string;
  year: number;
  totalEnterprises: number;
  totalEmployees: number;
  totalTurnoverMillionEur: number;
  byNace: Record<string, { enterprises: number; employees: number }>;
  bySizeClass: Record<string, { enterprises: number; employees: number }>;
}

/** Raw SDMX JSON response from the Eurostat API */
export interface EurostatSdmxResponse {
  header: {
    id: string;
    prepared: string;
    sender: { id: string };
  };
  dataSets: Array<{
    action: string;
    observations: Record<string, number[]>;
  }>;
  structure: {
    dimensions: {
      observation: Array<{
        id: string;
        values: Array<{ id: string; name: string }>;
      }>;
    };
  };
}

/** Eurostat JSON-stat v2 response format (used by statistics/1.0 endpoint) */
export interface EurostatJsonStatResponse {
  version: string;
  label: string;
  id: string[];
  size: number[];
  dimension: Record<
    string,
    {
      label: string;
      category: {
        index: Record<string, number>;
        label: Record<string, string>;
      };
    }
  >;
  value: Record<string, number | null>;
  status?: Record<string, string>;
}

/** Eurostat API error response */
export interface EurostatApiError {
  error: {
    status: number;
    label: string;
  };
}
