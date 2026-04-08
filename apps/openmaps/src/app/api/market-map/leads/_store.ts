/** In-memory leads store — shared across route handlers. Will be replaced with Drizzle DB. */

export interface LeadRecord {
  id: number;
  vatId?: string;
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
  enrichmentStatus: string;
  enrichmentDate?: string;
  leadScore: number;
  leadStatus: string;
  source?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const store: LeadRecord[] = [];
let idCounter = 1;

export function getLeadsStore(): LeadRecord[] {
  return store;
}

export function addLead(data: Omit<LeadRecord, "id" | "createdAt" | "updatedAt">): LeadRecord {
  const now = new Date().toISOString();
  const lead: LeadRecord = { ...data, id: idCounter++, createdAt: now, updatedAt: now };
  store.push(lead);
  return lead;
}

export function getLeadById(id: number): LeadRecord | undefined {
  return store.find(l => l.id === id);
}
