import type { Job } from "bullmq";
import { db } from "@opensoftware/openmailer-db";
import {
  segments,
  contacts,
  contactTags,
  segmentContacts,
} from "@opensoftware/openmailer-db/schema";
import { eq, and, like, gt, lt, gte, lte, ne, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface EvaluateSegmentsJob {
  workspaceId: string;
  /** If provided, only re-evaluate this specific segment. Otherwise evaluate all dynamic segments. */
  segmentId?: string;
}

/**
 * Segment condition as stored in the segments.conditions JSONB column.
 *
 * Supported field types:
 * - Contact fields: email, firstName, lastName, status, score
 * - Tag membership: tag (with operator "has" or "not_has")
 * - Custom fields: custom.<fieldName>
 */
interface SegmentCondition {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "starts_with"
    | "ends_with"
    | "greater_than"
    | "less_than"
    | "greater_than_or_equal"
    | "less_than_or_equal"
    | "has"
    | "not_has"
    | "is_set"
    | "is_not_set";
  value?: string | number;
}

/**
 * Evaluate dynamic segment membership.
 *
 * Workflow:
 * 1. Load all dynamic segments for the workspace (or a specific segment)
 * 2. For each segment, load all active workspace contacts
 * 3. Evaluate each contact against the segment's conditions
 * 4. Reconcile segmentContacts: remove contacts that no longer match,
 *    add contacts that now match
 */
export async function processEvaluateSegments(
  job: Job<EvaluateSegmentsJob>
) {
  const { workspaceId, segmentId } = job.data;
  console.log(
    `[segments] Evaluating segments for workspace ${workspaceId}${segmentId ? ` (segment ${segmentId})` : ""}`
  );

  // -- 1. Load segments to evaluate -------------------------------------------
  let segmentsToEvaluate;
  if (segmentId) {
    segmentsToEvaluate = await db
      .select()
      .from(segments)
      .where(
        and(
          eq(segments.id, segmentId),
          eq(segments.workspaceId, workspaceId),
          eq(segments.isDynamic, true)
        )
      );
  } else {
    segmentsToEvaluate = await db
      .select()
      .from(segments)
      .where(
        and(
          eq(segments.workspaceId, workspaceId),
          eq(segments.isDynamic, true)
        )
      );
  }

  if (segmentsToEvaluate.length === 0) {
    console.log("[segments] No dynamic segments to evaluate");
    return;
  }

  // -- 2. Load all active contacts for the workspace --------------------------
  const allContacts = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.workspaceId, workspaceId),
        eq(contacts.status, "active")
      )
    );

  // -- 3. Preload tag assignments for all contacts ----------------------------
  const allContactTagRows = await db
    .select()
    .from(contactTags);

  // Build a map: contactId -> Set<tagId>
  const contactTagMap = new Map<string, Set<string>>();
  for (const row of allContactTagRows) {
    if (!contactTagMap.has(row.contactId)) {
      contactTagMap.set(row.contactId, new Set());
    }
    contactTagMap.get(row.contactId)!.add(row.tagId);
  }

  // -- 4. Evaluate each segment -----------------------------------------------
  for (let s = 0; s < segmentsToEvaluate.length; s++) {
    const segment = segmentsToEvaluate[s];
    const conditions = (segment.conditions as SegmentCondition[]) || [];
    const logic = segment.conditionLogic || "and";

    // Find contacts that match the segment conditions
    const matchingContactIds = new Set<string>();

    for (const contact of allContacts) {
      const matches = evaluateContact(
        contact,
        conditions,
        logic,
        contactTagMap.get(contact.id) || new Set()
      );
      if (matches) {
        matchingContactIds.add(contact.id);
      }
    }

    // -- 5. Reconcile segmentContacts -----------------------------------------
    // Get current membership
    const currentMembers = await db
      .select({ contactId: segmentContacts.contactId })
      .from(segmentContacts)
      .where(eq(segmentContacts.segmentId, segment.id));

    const currentIds = new Set(currentMembers.map((m) => m.contactId));

    // Contacts to add (in matching but not in current)
    const toAdd = [...matchingContactIds].filter((id) => !currentIds.has(id));

    // Contacts to remove (in current but not in matching)
    const toRemove = [...currentIds].filter(
      (id) => !matchingContactIds.has(id)
    );

    // Remove stale memberships
    if (toRemove.length > 0) {
      await db
        .delete(segmentContacts)
        .where(
          and(
            eq(segmentContacts.segmentId, segment.id),
            inArray(segmentContacts.contactId, toRemove)
          )
        );
    }

    // Add new memberships
    if (toAdd.length > 0) {
      await db.insert(segmentContacts).values(
        toAdd.map((contactId) => ({
          segmentId: segment.id,
          contactId,
        }))
      );
    }

    console.log(
      `[segments] Segment "${segment.name}": ${matchingContactIds.size} members (added ${toAdd.length}, removed ${toRemove.length})`
    );

    // Update progress
    await job.updateProgress(
      Math.round(((s + 1) / segmentsToEvaluate.length) * 100)
    );
  }

  console.log(
    `[segments] Evaluated ${segmentsToEvaluate.length} segments for workspace ${workspaceId}`
  );
}

/**
 * Evaluate whether a single contact matches a set of segment conditions.
 */
function evaluateContact(
  contact: Record<string, unknown>,
  conditions: SegmentCondition[],
  logic: string,
  contactTagIds: Set<string>
): boolean {
  if (conditions.length === 0) return true;

  const results = conditions.map((condition) =>
    evaluateCondition(contact, condition, contactTagIds)
  );

  if (logic === "or") {
    return results.some(Boolean);
  }

  // Default: "and"
  return results.every(Boolean);
}

/**
 * Evaluate a single condition against a contact.
 */
function evaluateCondition(
  contact: Record<string, unknown>,
  condition: SegmentCondition,
  contactTagIds: Set<string>
): boolean {
  const { field, operator, value } = condition;

  // Handle tag-based conditions
  if (field === "tag") {
    const tagId = String(value);
    if (operator === "has") return contactTagIds.has(tagId);
    if (operator === "not_has") return !contactTagIds.has(tagId);
    return false;
  }

  // Resolve field value from contact
  let fieldValue: unknown;
  if (field.startsWith("custom.")) {
    const customKey = field.slice(7);
    const customFields = contact.customFields as Record<string, unknown> | null;
    fieldValue = customFields?.[customKey];
  } else {
    fieldValue = contact[field];
  }

  // Handle is_set / is_not_set before converting to strings
  if (operator === "is_set") {
    return fieldValue != null && fieldValue !== "";
  }
  if (operator === "is_not_set") {
    return fieldValue == null || fieldValue === "";
  }

  const strValue = fieldValue != null ? String(fieldValue) : "";
  const compareValue = value != null ? String(value) : "";

  switch (operator) {
    case "equals":
      return strValue.toLowerCase() === compareValue.toLowerCase();
    case "not_equals":
      return strValue.toLowerCase() !== compareValue.toLowerCase();
    case "contains":
      return strValue.toLowerCase().includes(compareValue.toLowerCase());
    case "not_contains":
      return !strValue.toLowerCase().includes(compareValue.toLowerCase());
    case "starts_with":
      return strValue.toLowerCase().startsWith(compareValue.toLowerCase());
    case "ends_with":
      return strValue.toLowerCase().endsWith(compareValue.toLowerCase());
    case "greater_than":
      return Number(strValue) > Number(compareValue);
    case "less_than":
      return Number(strValue) < Number(compareValue);
    case "greater_than_or_equal":
      return Number(strValue) >= Number(compareValue);
    case "less_than_or_equal":
      return Number(strValue) <= Number(compareValue);
    default:
      console.warn(`[segments] Unknown operator: ${operator}`);
      return false;
  }
}
