import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { checkApiAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { submissions, webhooks, flowNotifications } from "@/db/schema";
import { sendMail } from "@/lib/mailer";

// ─── Formats all answers as a readable plain-text table for email bodies ──────
function formatAnswers(answers: Record<string, unknown>): string {
  return Object.entries(answers)
    .map(([key, val]) => `${key}: ${String(val ?? "")}`)
    .join("\n");
}

async function triggerAutoReplyNotifications(
  flowId: string,
  submissionId: string,
  answers: Record<string, unknown>,
) {
  try {
    const activeNotifications = await db
      .select()
      .from(flowNotifications)
      .where(
        and(
          eq(flowNotifications.flowId, flowId),
          eq(flowNotifications.active, true),
          eq(flowNotifications.type, "auto_reply")
        )
      );

    for (const notification of activeNotifications) {
      try {
        const config = JSON.parse(notification.config) as {
          subject: string;
          body: string;
          emailFieldKey: string;
        };

        const submitterEmail = answers[config.emailFieldKey];
        if (!submitterEmail || typeof submitterEmail !== "string") {
          console.warn(
            `[Auto-Reply] No email found for fieldKey "${config.emailFieldKey}" in submission ${submissionId}`
          );
          continue;
        }

        // Replace {fieldKey} placeholders in subject and body
        let resolvedSubject = config.subject || "";
        let resolvedBody = config.body || "";
        for (const [key, value] of Object.entries(answers)) {
          const placeholder = `{${key}}`;
          const replacement = String(value ?? "");
          resolvedSubject = resolvedSubject.replaceAll(placeholder, replacement);
          resolvedBody = resolvedBody.replaceAll(placeholder, replacement);
        }

        await sendMail({ to: submitterEmail, subject: resolvedSubject, text: resolvedBody });
      } catch (err) {
        console.error(
          "[Auto-Reply Error]",
          notification.id,
          err instanceof Error ? err.message : err
        );
      }
    }
  } catch (err) {
    console.error("[Auto-Reply Fetch Error]", err);
  }
}

async function triggerRoutingNotifications(
  flowId: string,
  submissionId: string,
  answers: Record<string, unknown>,
) {
  try {
    const activeNotifications = await db
      .select()
      .from(flowNotifications)
      .where(
        and(
          eq(flowNotifications.flowId, flowId),
          eq(flowNotifications.active, true),
          eq(flowNotifications.type, "routing")
        )
      );

    for (const notification of activeNotifications) {
      try {
        const config = JSON.parse(notification.config) as {
          rules: Array<{
            fieldKey: string;
            operator: "equals" | "contains";
            value: string;
            emails: string[];
            subject?: string;
          }>;
        };

        for (const rule of config.rules) {
          const answerValue = String(answers[rule.fieldKey] ?? "");
          const matches =
            rule.operator === "equals"
              ? answerValue === rule.value
              : answerValue.toLowerCase().includes(rule.value.toLowerCase());

          if (matches) {
            const subject =
              rule.subject || `Neue Einsendung — Routing-Benachrichtigung`;
            const text =
              `Eine neue Einsendung (${submissionId}) hat die Routing-Bedingung erfüllt:\n` +
              `Feld: ${rule.fieldKey} = ${answerValue}\n\n` +
              `Antworten:\n${formatAnswers(answers)}`;
            await sendMail({ to: rule.emails, subject, text });
          }
        }
      } catch (err) {
        console.error(
          "[Routing Error]",
          notification.id,
          err instanceof Error ? err.message : err
        );
      }
    }
  } catch (err) {
    console.error("[Routing Fetch Error]", err);
  }
}

async function triggerEmailNotifications(
  flowId: string,
  submissionId: string,
  answers: Record<string, unknown>,
  metadata?: Record<string, unknown>
) {
  try {
    const activeNotifications = await db
      .select()
      .from(flowNotifications)
      .where(
        and(
          eq(flowNotifications.flowId, flowId),
          eq(flowNotifications.active, true),
          eq(flowNotifications.type, "email")
        )
      );

    for (const notification of activeNotifications) {
      try {
        const config = JSON.parse(notification.config) as {
          emails: string[];
          subject?: string;
        };

        const subject = config.subject || `Neue Einsendung erhalten`;
        const completedAt =
          (metadata?.completedAt as string) ?? new Date().toISOString();
        const text =
          `Es ist eine neue Einsendung eingegangen.\n\n` +
          `Einsendungs-ID: ${submissionId}\n` +
          `Flow-ID: ${flowId}\n` +
          `Eingegangen: ${completedAt}\n\n` +
          `Antworten:\n${formatAnswers(answers)}`;

        await sendMail({ to: config.emails, subject, text });
      } catch (err) {
        console.error(
          "[Email Notification Error]",
          notification.id,
          err instanceof Error ? err.message : err
        );
      }
    }
  } catch (err) {
    console.error("[Email Notification Fetch Error]", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      flowId,
      flowVersionId,
      submissionId,
      answers,
      status,
      lastStepId,
      metadata,
    } = body;

    if (!flowId || !answers) {
      return NextResponse.json(
        { error: "flowId and answers are required" },
        { status: 400 }
      );
    }

    const answersJson =
      typeof answers === "string" ? answers : JSON.stringify(answers);
    const metadataJson = metadata
      ? typeof metadata === "string"
        ? metadata
        : JSON.stringify(metadata)
      : undefined;

    if (submissionId) {
      // Update existing submission
      const updateData: Partial<typeof submissions.$inferInsert> & { completedAt?: Date } = {
        answers: answersJson,
        status: status ?? "in_progress",
        lastStepId: lastStepId ?? undefined,
        metadata: metadataJson,
      };

      if (status === "completed") {
        updateData.completedAt = new Date();
      }

      const [updated] = await db
        .update(submissions)
        .set(updateData)
        .where(eq(submissions.id, submissionId))
        .returning();

      if (!updated) {
        return NextResponse.json(
          { error: "Submission not found" },
          { status: 404 }
        );
      }

      // Fire webhooks async on completion (don't block response)
      if (status === "completed") {
        const activeWebhooks = await db
          .select()
          .from(webhooks)
          .where(and(eq(webhooks.flowId, flowId), eq(webhooks.active, true)));

        for (const webhook of activeWebhooks) {
          fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(webhook.secret ? { "X-Webhook-Secret": webhook.secret } : {}),
            },
            body: JSON.stringify({
              event: "submission.completed",
              flowId,
              submissionId: updated.id,
              answers: body.answers,
              metadata: body.metadata,
              timestamp: new Date().toISOString(),
            }),
          }).catch((err) =>
            console.error("[Webhook Error]", webhook.url, err.message)
          );
        }

        // Fire email notifications async on completion
        triggerEmailNotifications(flowId, updated.id, body.answers, body.metadata);

        // Fire auto-reply notifications async on completion
        triggerAutoReplyNotifications(flowId, updated.id, body.answers);

        // Fire routing notifications async on completion
        triggerRoutingNotifications(flowId, updated.id, body.answers);
      }

      return NextResponse.json({
        submissionId: updated.id,
        status: updated.status,
      });
    } else {
      // Create new submission
      const id = randomUUID();

      const [created] = await db
        .insert(submissions)
        .values({
          id,
          flowId,
          flowVersionId: flowVersionId ?? undefined,
          status: status ?? "in_progress",
          answers: answersJson,
          metadata: metadataJson,
          lastStepId: lastStepId ?? undefined,
          completedAt: status === "completed" ? new Date() : undefined,
        })
        .returning();

      // Fire webhooks async on completion (don't block response)
      if (status === "completed") {
        const activeWebhooks = await db
          .select()
          .from(webhooks)
          .where(and(eq(webhooks.flowId, flowId), eq(webhooks.active, true)));

        for (const webhook of activeWebhooks) {
          fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(webhook.secret ? { "X-Webhook-Secret": webhook.secret } : {}),
            },
            body: JSON.stringify({
              event: "submission.completed",
              flowId,
              submissionId: created.id,
              answers: body.answers,
              metadata: body.metadata,
              timestamp: new Date().toISOString(),
            }),
          }).catch((err) =>
            console.error("[Webhook Error]", webhook.url, err.message)
          );
        }

        // Fire email notifications async on completion
        triggerEmailNotifications(flowId, created.id, body.answers, body.metadata);

        // Fire auto-reply notifications async on completion
        triggerAutoReplyNotifications(flowId, created.id, body.answers);

        // Fire routing notifications async on completion
        triggerRoutingNotifications(flowId, created.id, body.answers);
      }

      return NextResponse.json(
        { submissionId: created.id, status: created.status },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("[POST /api/submissions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const flowId = searchParams.get("flowId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const conditions = [];
    if (flowId) conditions.push(eq(submissions.flowId, flowId));
    if (status)
      conditions.push(
        eq(submissions.status, status as "in_progress" | "completed" | "abandoned")
      );

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.query.submissions.findMany({
      where,
      orderBy: [desc(submissions.startedAt)],
      limit,
      offset,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("[GET /api/submissions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
