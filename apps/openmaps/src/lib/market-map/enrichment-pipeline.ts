/**
 * Enrichment Pipeline — chains VIES -> Register -> Enrichment -> Credit -> Contacts -> Score
 * Each stage is optional and the pipeline degrades gracefully.
 */

import { scoreLead } from "./market-scorer";

export type EnrichmentStage = "vies" | "register" | "enrichment" | "credit" | "contacts" | "insolvency" | "scoring";

export interface EnrichmentProgress {
  stage: EnrichmentStage;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  data?: Record<string, unknown>;
  error?: string;
  durationMs?: number;
}

export interface EnrichmentInput {
  vatId?: string;
  companyName?: string;
  countryCode: string;
  domain?: string;
}

export interface EnrichmentResult {
  success: boolean;
  stages: EnrichmentProgress[];
  lead: {
    vatId?: string;
    vatValid?: boolean;
    companyName: string;
    legalForm?: string;
    countryCode: string;
    postalCode?: string;
    city?: string;
    street?: string;
    website?: string;
    domain?: string;
    industry?: string;
    employeesRange?: string;
    revenueRange?: string;
    registerNumber?: string;
    registerCourt?: string;
    creditScore?: number;
    creditRating?: string;
    insolvencyRisk?: boolean;
    latitude?: number;
    longitude?: number;
    contactEmails?: string[];
    leadScore: number;
    enrichmentStatus: "partial" | "complete" | "failed";
  };
  totalDurationMs: number;
}

/**
 * Run the full enrichment pipeline for a company.
 * Each stage tries to enrich data; failures are logged but don't stop the pipeline.
 */
export async function runEnrichmentPipeline(
  input: EnrichmentInput,
  onProgress?: (progress: EnrichmentProgress) => void
): Promise<EnrichmentResult> {
  const start = Date.now();
  const stages: EnrichmentProgress[] = [];

  const lead: EnrichmentResult["lead"] = {
    companyName: input.companyName ?? "",
    countryCode: input.countryCode,
    vatId: input.vatId,
    domain: input.domain,
    leadScore: 0,
    enrichmentStatus: "partial",
  };

  // Stage 1: VIES VAT Validation
  const viesStage = await runStage("vies", async () => {
    if (!input.vatId) return { skipped: true };

    // Dynamic import to avoid hard dependency
    const { ViesVatClient } = await import(
      /* webpackIgnore: true */
      "@opensoftware/integrations/connectors/vies_vat"
    ).catch(() => ({ ViesVatClient: null }));

    if (!ViesVatClient) return { skipped: true, reason: "VIES client not available" };

    const client = new ViesVatClient();
    const result = await client.validateVatId(input.vatId);

    lead.vatValid = result.valid;
    if (result.name) lead.companyName = result.name;
    if (result.address) {
      // Try to parse address (VIES returns unstructured text)
      lead.street = result.address;
    }

    return { valid: result.valid, name: result.name, address: result.address };
  }, onProgress);
  stages.push(viesStage);

  // Stage 2: Register Lookup (placeholder — will use handelsregister/unternehmensregister connectors)
  const registerStage = await runStage("register", async () => {
    // TODO: Implement per-country register lookup
    // DE: HandelsregisterClient, NL: KVK, FR: Infogreffe, etc.
    return { skipped: true, reason: "Register lookup not yet implemented — Phase 3" };
  }, onProgress);
  stages.push(registerStage);

  // Stage 3: Company Enrichment (placeholder — will use Clearbit connector)
  const enrichmentStage = await runStage("enrichment", async () => {
    // TODO: ClearbitClient.findCompany(domain)
    if (input.domain) {
      lead.website = `https://${input.domain}`;
    }
    return { skipped: true, reason: "Clearbit enrichment not yet implemented — Phase 3" };
  }, onProgress);
  stages.push(enrichmentStage);

  // Stage 4: Credit Scoring (placeholder — will use Creditreform connector)
  const creditStage = await runStage("credit", async () => {
    // TODO: CreditreformClient.getCreditScore()
    return { skipped: true, reason: "Credit scoring not yet implemented — Phase 3" };
  }, onProgress);
  stages.push(creditStage);

  // Stage 5: Contact Discovery (placeholder — will use Hunter connector)
  const contactsStage = await runStage("contacts", async () => {
    // TODO: HunterClient.domainSearch(domain)
    return { skipped: true, reason: "Contact discovery not yet implemented — Phase 3" };
  }, onProgress);
  stages.push(contactsStage);

  // Stage 6: Insolvency Check (placeholder)
  const insolvencyStage = await runStage("insolvency", async () => {
    // TODO: CrifBuergelClient insolvency check
    return { skipped: true, reason: "Insolvency check not yet implemented — Phase 3" };
  }, onProgress);
  stages.push(insolvencyStage);

  // Stage 7: Lead Scoring (always runs)
  const scoringStage = await runStage("scoring", async () => {
    lead.leadScore = scoreLead({
      hasVatId: !!lead.vatId,
      vatValid: lead.vatValid,
      hasRegisterData: !!lead.registerNumber,
      creditScore: lead.creditScore,
      hasContactEmail: (lead.contactEmails?.length ?? 0) > 0,
      employeesRange: lead.employeesRange,
      revenueRange: lead.revenueRange,
      insolvencyRisk: lead.insolvencyRisk,
    });
    return { leadScore: lead.leadScore };
  }, onProgress);
  stages.push(scoringStage);

  // Determine overall enrichment status
  const completedStages = stages.filter(s => s.status === "success").length;
  const totalStages = stages.filter(s => s.status !== "skipped").length;
  lead.enrichmentStatus = totalStages === 0 ? "failed"
    : completedStages === totalStages ? "complete"
    : "partial";

  return {
    success: completedStages > 0,
    stages,
    lead,
    totalDurationMs: Date.now() - start,
  };
}

/** Helper to run a single pipeline stage with timing and error handling */
async function runStage(
  stage: EnrichmentStage,
  fn: () => Promise<Record<string, unknown>>,
  onProgress?: (progress: EnrichmentProgress) => void,
): Promise<EnrichmentProgress> {
  const progress: EnrichmentProgress = { stage, status: "running" };
  onProgress?.(progress);

  const start = Date.now();
  try {
    const data = await fn();
    if (data.skipped) {
      progress.status = "skipped";
      progress.data = data;
    } else {
      progress.status = "success";
      progress.data = data;
    }
  } catch (error) {
    progress.status = "failed";
    progress.error = error instanceof Error ? error.message : String(error);
  }
  progress.durationMs = Date.now() - start;
  onProgress?.(progress);
  return progress;
}
