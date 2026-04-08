// ==================== GDPR Register API Types ====================
// Management of processing activities (Art. 30 GDPR) and
// Data Protection Impact Assessments (Art. 35 GDPR).
// API key authentication.

/** Status of a processing activity record */
export type GdprProcessingStatus =
  | "draft"
  | "active"
  | "under_review"
  | "archived"
  | "deleted";

/** Legal basis for processing under GDPR Art. 6 */
export type GdprLegalBasis =
  | "consent"              // Art. 6(1)(a)
  | "contract"             // Art. 6(1)(b)
  | "legal_obligation"     // Art. 6(1)(c)
  | "vital_interests"      // Art. 6(1)(d)
  | "public_interest"      // Art. 6(1)(e)
  | "legitimate_interests"; // Art. 6(1)(f)

/** Category of data subjects */
export type GdprDataSubjectCategory =
  | "employees"
  | "customers"
  | "suppliers"
  | "applicants"
  | "website_visitors"
  | "newsletter_subscribers"
  | "patients"
  | "students"
  | "members"
  | "other";

/** Category of personal data */
export type GdprDataCategory =
  | "identification"       // Name, address, ID numbers
  | "contact"              // Email, phone
  | "financial"            // Bank details, salary
  | "employment"           // Job title, employment history
  | "health"               // Special category (Art. 9)
  | "biometric"            // Special category (Art. 9)
  | "genetic"              // Special category (Art. 9)
  | "political"            // Special category (Art. 9)
  | "religious"            // Special category (Art. 9)
  | "trade_union"          // Special category (Art. 9)
  | "sexual_orientation"   // Special category (Art. 9)
  | "criminal"             // Art. 10
  | "location"
  | "behavioral"
  | "technical"            // IP, device info
  | "other";

/** Risk level for DPIA */
export type GdprRiskLevel = "low" | "medium" | "high" | "critical";

/** DPIA status */
export type GdprDpiaStatus =
  | "not_required"
  | "pending"
  | "in_progress"
  | "completed"
  | "requires_consultation"; // Art. 36: prior consultation with supervisory authority

// ==================== Processing Activity (Art. 30) ====================

/** Record of Processing Activity (ROPA) per Art. 30 GDPR */
export interface GdprProcessingActivity {
  /** Unique identifier */
  id: string;
  /** Name/title of the processing activity */
  name: string;
  /** Description of the processing */
  description: string;
  /** Department or business unit responsible */
  department?: string;
  /** Status */
  status: GdprProcessingStatus;
  /** Purpose(s) of processing */
  purposes: string[];
  /** Legal basis */
  legalBasis: GdprLegalBasis;
  /** Description of legitimate interest (if legalBasis is legitimate_interests) */
  legitimateInterestDescription?: string;
  /** Categories of data subjects */
  dataSubjectCategories: GdprDataSubjectCategory[];
  /** Categories of personal data */
  dataCategories: GdprDataCategory[];
  /** Whether special categories of data (Art. 9) are processed */
  specialCategoryData: boolean;
  /** Recipients or categories of recipients */
  recipients: string[];
  /** Whether data is transferred to third countries */
  thirdCountryTransfer: boolean;
  /** Third country transfer details */
  thirdCountryDetails?: GdprThirdCountryTransfer[];
  /** Planned retention period or criteria */
  retentionPeriod: string;
  /** Technical and organizational security measures (Art. 32) */
  securityMeasures: string[];
  /** Data Protection Officer reference */
  dpoReference?: string;
  /** Joint controller information (Art. 26) */
  jointControllers?: string[];
  /** Processors involved (Art. 28) */
  processors?: GdprProcessor[];
  /** Whether a DPIA is required */
  dpiaRequired: boolean;
  /** DPIA ID (if applicable) */
  dpiaId?: string;
  /** Date created */
  createdAt: string;
  /** Date last updated */
  updatedAt: string;
  /** Created by (user reference) */
  createdBy?: string;
}

/** Third country transfer details */
export interface GdprThirdCountryTransfer {
  /** Country name or code */
  country: string;
  /** Transfer mechanism (Art. 46, 47, 49) */
  transferMechanism: "adequacy_decision" | "standard_contractual_clauses" | "binding_corporate_rules" | "derogation" | "other";
  /** Description of safeguards */
  safeguards?: string;
}

/** Processor information (Art. 28) */
export interface GdprProcessor {
  /** Processor name */
  name: string;
  /** Processor address/location */
  location?: string;
  /** Processing agreement reference */
  agreementReference?: string;
  /** Date of processing agreement */
  agreementDate?: string;
}

// ==================== DPIA (Art. 35) ====================

/** Data Protection Impact Assessment */
export interface GdprDpia {
  /** Unique identifier */
  id: string;
  /** Title */
  title: string;
  /** Description of the processing operation */
  description: string;
  /** Status */
  status: GdprDpiaStatus;
  /** Associated processing activity IDs */
  processingActivityIds: string[];
  /** Necessity and proportionality assessment */
  necessityAssessment: string;
  /** Risk assessment */
  risks: GdprDpiaRisk[];
  /** Measures to mitigate risks */
  mitigationMeasures: GdprMitigationMeasure[];
  /** Consultation with DPO */
  dpoConsultation?: GdprConsultation;
  /** Consultation with data subjects (if applicable) */
  dataSubjectConsultation?: string;
  /** Overall residual risk level after mitigation */
  residualRiskLevel: GdprRiskLevel;
  /** Whether prior consultation with supervisory authority is needed (Art. 36) */
  priorConsultationRequired: boolean;
  /** Approval details */
  approvedBy?: string;
  /** Date of approval */
  approvedAt?: string;
  /** Date created */
  createdAt: string;
  /** Date last updated */
  updatedAt: string;
}

/** Risk identified in a DPIA */
export interface GdprDpiaRisk {
  /** Risk description */
  description: string;
  /** Affected data subjects */
  affectedSubjects: GdprDataSubjectCategory[];
  /** Likelihood */
  likelihood: GdprRiskLevel;
  /** Impact/severity */
  severity: GdprRiskLevel;
  /** Overall risk level */
  riskLevel: GdprRiskLevel;
  /** Source of the risk */
  source?: string;
}

/** Mitigation measure in a DPIA */
export interface GdprMitigationMeasure {
  /** Description of the measure */
  description: string;
  /** Type of measure */
  type: "technical" | "organizational" | "legal" | "contractual";
  /** Implementation status */
  implementationStatus: "planned" | "in_progress" | "implemented";
  /** Responsible person/department */
  responsible?: string;
  /** Deadline for implementation */
  deadline?: string;
}

/** DPO consultation record */
export interface GdprConsultation {
  /** DPO name */
  dpoName: string;
  /** Date of consultation */
  date: string;
  /** DPO opinion/recommendation */
  opinion: string;
}

// ==================== Request / Response ====================

/** Parameters for listing processing activities */
export interface GdprListProcessingParams {
  /** Filter by status */
  status?: GdprProcessingStatus;
  /** Filter by department */
  department?: string;
  /** Filter by legal basis */
  legalBasis?: GdprLegalBasis;
  /** Search query */
  search?: string;
  /** Page number */
  page?: number;
  /** Page size */
  pageSize?: number;
}

/** Paginated list response */
export interface GdprListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Parameters for creating/updating a processing activity */
export interface GdprCreateProcessingParams {
  name: string;
  description: string;
  department?: string;
  purposes: string[];
  legalBasis: GdprLegalBasis;
  legitimateInterestDescription?: string;
  dataSubjectCategories: GdprDataSubjectCategory[];
  dataCategories: GdprDataCategory[];
  specialCategoryData?: boolean;
  recipients?: string[];
  thirdCountryTransfer?: boolean;
  thirdCountryDetails?: GdprThirdCountryTransfer[];
  retentionPeriod: string;
  securityMeasures?: string[];
  processors?: GdprProcessor[];
}

/** Parameters for creating a DPIA */
export interface GdprCreateDpiaParams {
  title: string;
  description: string;
  processingActivityIds: string[];
  necessityAssessment: string;
  risks?: GdprDpiaRisk[];
  mitigationMeasures?: GdprMitigationMeasure[];
}

// ==================== Client Config ====================

export interface GdprRegisterClientConfig {
  /** API key for authentication */
  apiKey: string;
  /** Organization/workspace ID */
  organizationId?: string;
  /** Base URL override (for self-hosted instances) */
  baseUrl?: string;
  /** Request timeout in ms */
  timeout?: number;
}
