import type { Job } from "bullmq";
import type { SendCampaignJob } from "@opensoftware/openmailer-queue";
import { db } from "@opensoftware/openmailer-db";
import {
  campaigns,
  contacts,
  segmentContacts,
  campaignEvents,
  emailTemplates,
} from "@opensoftware/openmailer-db/schema";
import { renderTemplate } from "@opensoftware/openmailer-email";
import { eq, and, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { sendEmail } from "../services/email-sender.js";

const BATCH_SIZE = 100;

/**
 * Process a campaign send job.
 *
 * Workflow:
 * 1. Load campaign and validate it has a segment and template
 * 2. Fetch all contact IDs from the segment
 * 3. In batches of 100, fetch active contacts and send emails
 * 4. For each contact, render the template with variable substitution
 * 5. Send via workspace SMTP transport (nodemailer)
 * 6. Record campaignEvent per contact (sent / bounced / failed)
 * 7. Update campaign status to "sent" when complete
 */
export async function processSendCampaign(job: Job<SendCampaignJob>) {
  const { campaignId, workspaceId } = job.data;
  console.log(`[campaign] Processing campaign ${campaignId}`);

  // -- 1. Load campaign -------------------------------------------------------
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(
      and(eq(campaigns.id, campaignId), eq(campaigns.workspaceId, workspaceId))
    );

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  if (!campaign.segmentId) {
    throw new Error(`Campaign ${campaignId} has no segment assigned`);
  }

  // -- 2. Load template -------------------------------------------------------
  let templateHtml = "";
  if (campaign.templateId) {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, campaign.templateId));

    if (template) {
      templateHtml = template.htmlBody;
    }
  }

  if (!templateHtml) {
    throw new Error(`Campaign ${campaignId} has no template or template body`);
  }

  // -- 3. Fetch contact IDs from segment --------------------------------------
  const segmentContactList = await db
    .select({ contactId: segmentContacts.contactId })
    .from(segmentContacts)
    .where(eq(segmentContacts.segmentId, campaign.segmentId));

  const contactIds = segmentContactList.map((sc) => sc.contactId);

  if (contactIds.length === 0) {
    console.log(`[campaign] No contacts in segment, marking ${campaignId} as sent`);
    await db
      .update(campaigns)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(campaigns.id, campaignId));
    return;
  }

  // -- 4. Update campaign status to "sending" ---------------------------------
  await db
    .update(campaigns)
    .set({ status: "sending" })
    .where(eq(campaigns.id, campaignId));

  // -- 5. Process contacts in batches -----------------------------------------
  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
    const batchIds = contactIds.slice(i, i + BATCH_SIZE);

    // Fetch only active contacts from this batch
    const contactBatch = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.workspaceId, workspaceId),
          eq(contacts.status, "active"),
          inArray(contacts.id, batchIds)
        )
      );

    for (const contact of contactBatch) {
      try {
        // Render template with contact variable substitution
        const renderedHtml = renderTemplate(templateHtml, {
          email: contact.email,
          firstName: contact.firstName ?? undefined,
          lastName: contact.lastName ?? undefined,
          customFields:
            (contact.customFields as Record<string, unknown>) ?? {},
        });

        // Render subject with contact variables too
        const renderedSubject = renderTemplate(campaign.subject, {
          email: contact.email,
          firstName: contact.firstName ?? undefined,
          lastName: contact.lastName ?? undefined,
          customFields:
            (contact.customFields as Record<string, unknown>) ?? {},
        });

        // Send actual email via workspace SMTP transport
        await sendEmail({
          workspaceId,
          to: contact.email,
          subject: renderedSubject,
          html: renderedHtml,
          from: {
            name: campaign.fromName,
            email: campaign.fromEmail,
          },
          replyTo: campaign.replyTo ?? undefined,
        });

        // Record successful send event
        await db.insert(campaignEvents).values({
          id: randomUUID(),
          campaignId,
          contactId: contact.id,
          type: "sent",
          metadata: {},
          createdAt: new Date(),
        });

        sentCount++;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : String(err);
        console.error(
          `[campaign] Failed to send to ${contact.email}:`,
          errorMessage
        );

        // Determine event type based on error
        const isBounce =
          errorMessage.includes("550") ||
          errorMessage.includes("551") ||
          errorMessage.includes("552") ||
          errorMessage.includes("553") ||
          errorMessage.includes("mailbox not found") ||
          errorMessage.includes("user unknown");

        await db.insert(campaignEvents).values({
          id: randomUUID(),
          campaignId,
          contactId: contact.id,
          type: isBounce ? "bounced" : "failed",
          metadata: { error: errorMessage },
          createdAt: new Date(),
        });

        failedCount++;
      }
    }

    // Update job progress
    const progress = Math.min(
      100,
      Math.round(((i + BATCH_SIZE) / contactIds.length) * 100)
    );
    await job.updateProgress(progress);
  }

  // -- 6. Mark campaign as sent -----------------------------------------------
  await db
    .update(campaigns)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(campaigns.id, campaignId));

  console.log(
    `[campaign] Campaign ${campaignId} complete: ${sentCount} sent, ${failedCount} failed out of ${contactIds.length} contacts`
  );
}
