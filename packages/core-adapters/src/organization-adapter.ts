import type {
  CanonicalOrganization,
  CanonicalOrgMember,
} from "@opensoftware/core-types";

export interface OrganizationPage {
  items: CanonicalOrganization[];
  nextCursor: string | null;
}

export interface OrganizationQuery {
  workspaceId?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

export interface OrganizationAdapter<TLocalOrg, TLocalMember = unknown> {
  toCanonical(local: TLocalOrg): CanonicalOrganization;
  fromCanonical(canonical: CanonicalOrganization): TLocalOrg;
  list(query: OrganizationQuery): Promise<OrganizationPage>;
  get(id: string): Promise<CanonicalOrganization | null>;
  upsert(canonical: CanonicalOrganization): Promise<CanonicalOrganization>;
  delete(id: string): Promise<void>;
  listMembers(orgId: string): Promise<CanonicalOrgMember[]>;
}
