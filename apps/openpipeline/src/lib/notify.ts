import { db, schema } from "@/db";

type NotificationType = "zugewiesen" | "kommentar" | "faellig" | "verschoben" | "erwaehnt";

export function createNotification(
  userId: string,
  typ: NotificationType,
  titel: string,
  opts?: {
    karteId?: string;
    pipelineId?: string;
    nachricht?: string;
    link?: string;
  },
) {
  db.insert(schema.pipBenachrichtigungen)
    .values({
      id: crypto.randomUUID(),
      userId,
      typ,
      titel,
      karteId: opts?.karteId ?? null,
      pipelineId: opts?.pipelineId ?? null,
      nachricht: opts?.nachricht ?? null,
      link: opts?.link ?? null,
    })
    .run();
}

export function notifyCardAssigned(
  assignedUserId: string,
  karteId: string,
  pipelineId: string,
  karteTitel: string,
) {
  createNotification(assignedUserId, "zugewiesen", `Dir wurde "${karteTitel}" zugewiesen`, {
    karteId,
    pipelineId,
    link: `/pipelines/${pipelineId}?karte=${karteId}`,
  });
}

export function notifyComment(
  recipientUserIds: string[],
  authorUserId: string,
  karteId: string,
  pipelineId: string,
  karteTitel: string,
) {
  for (const userId of recipientUserIds) {
    if (userId === authorUserId) continue;
    createNotification(userId, "kommentar", `Neuer Kommentar auf "${karteTitel}"`, {
      karteId,
      pipelineId,
      link: `/pipelines/${pipelineId}?karte=${karteId}`,
    });
  }
}

export function notifyMention(
  mentionedUserIds: string[],
  authorUserId: string,
  karteId: string,
  pipelineId: string,
  karteTitel: string,
) {
  for (const userId of mentionedUserIds) {
    if (userId === authorUserId) continue;
    createNotification(userId, "erwaehnt", `Du wurdest in "${karteTitel}" erwaehnt`, {
      karteId,
      pipelineId,
      link: `/pipelines/${pipelineId}?karte=${karteId}`,
    });
  }
}
