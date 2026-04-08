// ==================== Gesetze im Internet API Types ====================
// Access to German federal laws via gesetze-im-internet.de.
// No authentication required. XML-based responses.

/** Type of German legal norm */
export type GiiNormType =
  | "gesetz"            // Federal law (Bundesgesetz)
  | "verordnung"        // Regulation (Rechtsverordnung)
  | "satzung"           // Statute
  | "verwaltungsvorschrift"; // Administrative regulation

/** Status of a law */
export type GiiLawStatus =
  | "in_force"          // Currently in force
  | "partially_in_force"
  | "not_yet_in_force"
  | "repealed";         // No longer in force

// ==================== Table of Contents ====================

/** Top-level table of contents for all available laws */
export interface GiiTableOfContents {
  /** Total number of available laws */
  totalCount: number;
  /** List of available law entries */
  items: GiiTocEntry[];
}

/** Entry in the table of contents */
export interface GiiTocEntry {
  /** Abbreviation of the law (e.g., "BGB", "StGB", "GG") */
  abbreviation: string;
  /** Full official title */
  title: string;
  /** Jurisdiction key */
  jurisId: string;
  /** URL to the full XML of this law */
  xmlUrl: string;
  /** Date of last update */
  lastUpdated?: string;
}

// ==================== Law Structure ====================

/** A complete law with all its sections and paragraphs */
export interface GiiLaw {
  /** Abbreviation (e.g., "BGB") */
  abbreviation: string;
  /** Full official title */
  title: string;
  /** Long title as published */
  longTitle?: string;
  /** Date of promulgation (Ausfertigung) */
  promulgationDate?: string;
  /** Date of last amendment */
  lastAmendmentDate?: string;
  /** Citation reference (Fundstelle) */
  citationReference?: string;
  /** Current status */
  status: GiiLawStatus;
  /** Footnotes on the law level */
  footnotes?: string[];
  /** Structural elements (parts, sections, paragraphs) */
  structure: GiiStructuralElement[];
}

/** A structural element in a law (Book, Part, Section, Article, Paragraph) */
export interface GiiStructuralElement {
  /** Type of structural element */
  type: "buch" | "teil" | "abschnitt" | "unterabschnitt" | "titel" | "artikel" | "paragraph" | "anlage";
  /** Element identifier (e.g., "§ 433", "Art 1") */
  identifier: string;
  /** Title or heading of this element */
  heading?: string;
  /** Text content of this element (for leaf nodes) */
  content?: string;
  /** Nested child elements */
  children?: GiiStructuralElement[];
  /** Footnotes for this element */
  footnotes?: string[];
}

// ==================== Norm / Paragraph ====================

/** A single norm (paragraph/article) from a law */
export interface GiiNorm {
  /** Law abbreviation */
  lawAbbreviation: string;
  /** Paragraph/article identifier (e.g., "§ 433", "Art 1 GG") */
  identifier: string;
  /** Title of this norm */
  heading?: string;
  /** Full text content */
  content: string;
  /** Document number for citation */
  documentNumber?: string;
  /** HTML-formatted content */
  htmlContent?: string;
}

// ==================== Search ====================

/** Search parameters for Gesetze im Internet */
export interface GiiSearchParams {
  /** Search query (text to search for) */
  query: string;
  /** Filter by law abbreviation (e.g., "BGB", "StGB") */
  lawAbbreviation?: string;
  /** Maximum results to return */
  limit?: number;
}

/** Search response */
export interface GiiSearchResponse {
  /** Total number of matching norms */
  totalResults: number;
  /** Matching norms */
  results: GiiNorm[];
}

// ==================== Client Config ====================

export interface GiiClientConfig {
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}
