import type { Job } from "bullmq";
import type { ImportContactsJob } from "@opensoftware/openmailer-queue";
import { db } from "@opensoftware/openmailer-db";
import { contacts, contactTags } from "@opensoftware/openmailer-db/schema";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";

/**
 * Process a contact import job from a CSV file.
 *
 * Workflow:
 * 1. Read the CSV file from the uploaded path
 * 2. Parse headers and rows
 * 3. Map CSV fields to contact table columns using fieldMapping
 * 4. Insert each contact row, skipping rows without an email
 * 5. Attach specified tags to imported contacts
 * 6. Report progress throughout the import
 */
export async function processImportContacts(job: Job<ImportContactsJob>) {
  const { workspaceId, filePath, fieldMapping, tagIds } = job.data;
  console.log(`[import] Processing contact import for workspace ${workspaceId}`);

  // -- 1. Read and parse CSV --------------------------------------------------
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    console.log("[import] CSV file has no data rows");
    return;
  }

  const headers = parseCSVRow(lines[0]);
  const total = lines.length - 1;

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // -- 2. Process each row ----------------------------------------------------
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });

    // Build contact data from field mapping
    const contactData: Record<string, unknown> = {
      id: randomUUID(),
      workspaceId,
      status: "active",
      emailConsent: false,
      trackingConsent: false,
      score: 0,
      customFields: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Apply field mapping: CSV column name -> database column name
    const customFields: Record<string, string> = {};
    for (const [csvField, dbField] of Object.entries(fieldMapping) as [string, string][]) {
      if (row[csvField] === undefined) continue;

      // If the dbField starts with "custom.", store in customFields
      if (dbField.startsWith("custom.")) {
        const customKey = dbField.slice(7);
        customFields[customKey] = row[csvField];
      } else {
        contactData[dbField] = row[csvField];
      }
    }

    if (Object.keys(customFields).length > 0) {
      contactData.customFields = customFields;
    }

    // Skip rows without an email address
    if (!contactData.email) {
      skipped++;
      continue;
    }

    try {
      await db.insert(contacts).values(contactData as any);
      imported++;

      // Attach tags if specified
      if (tagIds && tagIds.length > 0) {
        for (const tagId of tagIds) {
          await db.insert(contactTags).values({
            contactId: contactData.id as string,
            tagId,
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Handle duplicate email gracefully
      if (
        errorMessage.includes("unique") ||
        errorMessage.includes("duplicate")
      ) {
        console.log(
          `[import] Duplicate contact skipped: ${contactData.email}`
        );
        skipped++;
      } else {
        console.error(`[import] Failed to import row ${i}:`, errorMessage);
        failed++;
      }
    }

    // Update progress
    await job.updateProgress(Math.round((i / total) * 100));
  }

  console.log(
    `[import] Import complete: ${imported} imported, ${skipped} skipped, ${failed} failed out of ${total} rows`
  );
}

/**
 * Parse a single CSV row, handling quoted fields that may contain commas.
 */
function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Handle escaped quotes (doubled)
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
