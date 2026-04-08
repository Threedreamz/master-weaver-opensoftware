import { eq, desc, and, isNull, sql, count } from "drizzle-orm";
import { db } from "../index";
import { farmNotifications, farmNotificationPreferences } from "../schema";

export async function getNotifications(filters?: {
  assignedTo?: string;
  type?: string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}) {
  const conditions = [];

  if (filters?.assignedTo) {
    conditions.push(eq(farmNotifications.assignedTo, filters.assignedTo));
  }
  if (filters?.type) {
    conditions.push(eq(farmNotifications.type, filters.type as typeof farmNotifications.type.enumValues[number]));
  }
  if (filters?.unreadOnly) {
    conditions.push(isNull(farmNotifications.readAt));
    conditions.push(isNull(farmNotifications.dismissedAt));
  }

  return db.query.farmNotifications.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(farmNotifications.createdAt)],
    limit: filters?.limit ?? 50,
    offset: filters?.offset ?? 0,
    with: {
      printer: true,
      job: true,
    },
  });
}

export async function getUnreadCount(assignedTo?: string) {
  const conditions = [
    isNull(farmNotifications.readAt),
    isNull(farmNotifications.dismissedAt),
  ];
  if (assignedTo) {
    conditions.push(eq(farmNotifications.assignedTo, assignedTo));
  }

  const result = await db
    .select({ count: count() })
    .from(farmNotifications)
    .where(and(...conditions));

  return result[0]?.count ?? 0;
}

export async function createNotification(data: {
  type: typeof farmNotifications.type.enumValues[number];
  severity: typeof farmNotifications.severity.enumValues[number];
  title: string;
  message: string;
  printerId?: string;
  jobId?: string;
  assignedTo?: string;
  metadata?: Record<string, unknown>;
}) {
  const [notification] = await db.insert(farmNotifications).values(data).returning();
  return notification;
}

export async function markNotificationRead(id: string) {
  const [notification] = await db
    .update(farmNotifications)
    .set({ readAt: sql`(unixepoch())` })
    .where(eq(farmNotifications.id, id))
    .returning();
  return notification;
}

export async function dismissNotification(id: string) {
  const [notification] = await db
    .update(farmNotifications)
    .set({ dismissedAt: sql`(unixepoch())` })
    .where(eq(farmNotifications.id, id))
    .returning();
  return notification;
}

export async function markAllRead(assignedTo?: string) {
  const conditions = [
    isNull(farmNotifications.readAt),
    isNull(farmNotifications.dismissedAt),
  ];
  if (assignedTo) {
    conditions.push(eq(farmNotifications.assignedTo, assignedTo));
  }

  await db
    .update(farmNotifications)
    .set({ readAt: sql`(unixepoch())` })
    .where(and(...conditions));
}

export async function getNotificationPreferences(userId: string) {
  return db.query.farmNotificationPreferences.findMany({
    where: eq(farmNotificationPreferences.userId, userId),
  });
}

export async function upsertNotificationPreference(
  userId: string,
  notificationType: string,
  enabled: boolean
) {
  const existing = await db.query.farmNotificationPreferences.findFirst({
    where: and(
      eq(farmNotificationPreferences.userId, userId),
      eq(farmNotificationPreferences.notificationType, notificationType)
    ),
  });

  if (existing) {
    const [pref] = await db
      .update(farmNotificationPreferences)
      .set({ enabled })
      .where(eq(farmNotificationPreferences.id, existing.id))
      .returning();
    return pref;
  }

  const [pref] = await db
    .insert(farmNotificationPreferences)
    .values({ userId, notificationType, enabled })
    .returning();
  return pref;
}
