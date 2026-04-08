// ==================== SSL Labs API Types ====================
// SSL/TLS server analysis via the Qualys SSL Labs API.
// No authentication required. Public API.

/** Overall SSL grade */
export type SslGrade =
  | "A+"
  | "A"
  | "A-"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "T"   // Trust issues (certificate not trusted)
  | "M"   // Certificate name mismatch
  | "N";  // Not yet available

/** Status of an analysis */
export type SslAnalysisStatus =
  | "DNS"          // Resolving DNS
  | "ERROR"        // Analysis failed
  | "IN_PROGRESS"  // Analysis running
  | "READY";       // Analysis complete

/** Status of an individual endpoint (server) */
export type SslEndpointStatus =
  | "In progress"
  | "Ready"
  | "Error";

/** Protocol version */
export type SslProtocol =
  | "SSL 2.0"
  | "SSL 3.0"
  | "TLS 1.0"
  | "TLS 1.1"
  | "TLS 1.2"
  | "TLS 1.3";

// ==================== Analysis ====================

/** Top-level SSL Labs analysis result */
export interface SslAnalysis {
  /** Hostname that was analyzed */
  host: string;
  /** Port (usually 443) */
  port: number;
  /** Protocol (usually "https") */
  protocol: string;
  /** Whether this is a public server */
  isPublic: boolean;
  /** Analysis status */
  status: SslAnalysisStatus;
  /** Status message */
  statusMessage?: string;
  /** Start time (Unix timestamp in ms) */
  startTime: number;
  /** Test time (Unix timestamp in ms) */
  testTime?: number;
  /** Engine version used */
  engineVersion?: string;
  /** Criteria version used */
  criteriaVersion?: string;
  /** Individual endpoint (server IP) results */
  endpoints: SslEndpoint[];
  /** Certificate chains */
  certs?: SslCertificate[];
}

/** Individual server endpoint result */
export interface SslEndpoint {
  /** IP address */
  ipAddress: string;
  /** Server hostname */
  serverName?: string;
  /** Endpoint status */
  statusMessage: string;
  /** Grade (A+ to F) */
  grade?: SslGrade;
  /** Grade if trust issues are ignored */
  gradeTrustIgnored?: SslGrade;
  /** Has warnings */
  hasWarnings?: boolean;
  /** Whether this result is exceptional (e.g., unusual configuration) */
  isExceptional?: boolean;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Duration of the test in ms */
  duration?: number;
  /** Detailed endpoint result */
  details?: SslEndpointDetails;
}

/** Detailed results for an endpoint */
export interface SslEndpointDetails {
  /** Host start time */
  hostStartTime: number;
  /** Server key information */
  key: SslKey;
  /** Certificate information */
  cert: SslCertificateInfo;
  /** Supported protocols */
  protocols: SslProtocolInfo[];
  /** Supported cipher suites */
  suites: SslSuiteList;
  /** HSTS policy */
  hstsPolicy?: SslHstsPolicy;
  /** Whether HSTS with preloading is supported */
  hstsPreloaded?: boolean;
  /** Whether HTTP public key pinning is used */
  hpkpPolicy?: SslHpkpPolicy;
  /** Forward secrecy support */
  forwardSecrecy: number;
  /** Whether the server supports OCSP stapling */
  ocspStapling?: boolean;
  /** Whether the server is vulnerable to known attacks */
  vulnerabilities?: SslVulnerabilities;
  /** Server signature */
  serverSignature?: string;
  /** HTTP status code */
  httpStatusCode?: number;
  /** Supported named groups (for key exchange) */
  namedGroups?: SslNamedGroup[];
}

/** Server key information */
export interface SslKey {
  /** Key size in bits */
  size: number;
  /** Key algorithm (e.g., "RSA", "EC") */
  algorithm: string;
  /** Strength rating */
  strength: number;
}

/** Certificate information from endpoint details */
export interface SslCertificateInfo {
  /** Subject (CN) */
  subject: string;
  /** Common names */
  commonNames: string[];
  /** Subject alternative names (SANs) */
  altNames: string[];
  /** Not before date (Unix timestamp in ms) */
  notBefore: number;
  /** Not after date (Unix timestamp in ms) */
  notAfter: number;
  /** Issuer subject */
  issuerSubject: string;
  /** Signature algorithm */
  sigAlg: string;
  /** Certificate issues (bitmask) */
  issues: number;
  /** Is this an EV (Extended Validation) cert? */
  isEv?: boolean;
}

/** Certificate in the chain */
export interface SslCertificate {
  /** Certificate subject */
  subject: string;
  /** Issuer */
  issuer: string;
  /** SHA-256 fingerprint */
  sha256Hash: string;
  /** Not before date */
  notBefore: number;
  /** Not after date */
  notAfter: number;
  /** Key algorithm */
  keyAlg: string;
  /** Key size */
  keySize: number;
  /** Signature algorithm */
  sigAlg: string;
}

/** Protocol information */
export interface SslProtocolInfo {
  /** Protocol ID */
  id: number;
  /** Protocol name (e.g., "TLS") */
  name: string;
  /** Protocol version (e.g., "1.3") */
  version: string;
}

/** Cipher suite list */
export interface SslSuiteList {
  /** List of cipher suites */
  list: SslSuite[];
  /** Whether the server has a preference order */
  preference?: boolean;
}

/** Individual cipher suite */
export interface SslSuite {
  /** Suite ID */
  id: number;
  /** Suite name (e.g., "TLS_AES_256_GCM_SHA384") */
  name: string;
  /** Cipher strength in bits */
  cipherStrength: number;
  /** Key exchange */
  kxType?: string;
  /** Key exchange strength */
  kxStrength?: number;
}

/** HSTS policy */
export interface SslHstsPolicy {
  /** HSTS header present */
  status: "present" | "absent" | "disabled" | "error";
  /** Max-age value in seconds */
  maxAge?: number;
  /** Include subdomains */
  includeSubDomains?: boolean;
  /** Preload flag */
  preload?: boolean;
}

/** HPKP policy */
export interface SslHpkpPolicy {
  status: "present" | "absent" | "disabled" | "error";
  pins?: string[];
  maxAge?: number;
  includeSubDomains?: boolean;
  reportUri?: string;
}

/** Known SSL/TLS vulnerabilities */
export interface SslVulnerabilities {
  /** Vulnerable to BEAST attack */
  beast?: boolean;
  /** Vulnerable to POODLE (TLS) */
  poodleTls?: number;
  /** Vulnerable to DROWN */
  drownVulnerable?: boolean;
  /** Vulnerable to Heartbleed */
  heartbleed?: boolean;
  /** Vulnerable to OpenSSL CCS injection */
  openSslCcs?: number;
  /** Vulnerable to Ticketbleed */
  ticketbleed?: number;
  /** Vulnerable to ROBOT attack */
  bleichenbacher?: number;
  /** Supports 0-RTT (potential replay risk) */
  zeroRTTEnabled?: number;
}

/** Named group for key exchange */
export interface SslNamedGroup {
  id: number;
  name: string;
  bits: number;
}

// ==================== Simplified Results ====================

/** Simplified SSL analysis summary */
export interface SslAnalysisSummary {
  /** Hostname */
  host: string;
  /** Overall grade (best across endpoints) */
  grade: SslGrade | null;
  /** Whether the certificate is valid */
  certificateValid: boolean;
  /** Certificate expiry date */
  certificateExpires: string | null;
  /** Days until certificate expiry */
  daysUntilExpiry: number | null;
  /** Supported TLS versions */
  supportedProtocols: string[];
  /** Whether TLS 1.3 is supported */
  tls13Supported: boolean;
  /** Whether HSTS is enabled */
  hstsEnabled: boolean;
  /** Whether forward secrecy is supported */
  forwardSecrecy: boolean;
  /** Known vulnerabilities found */
  vulnerabilities: string[];
  /** Number of endpoints tested */
  endpointCount: number;
}

// ==================== Client Config ====================

export interface SslLabsClientConfig {
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Whether to publish results (default: false) */
  publish?: boolean;
}
