import { db } from "@/infra/db";
import { createLogger } from "@/shared/lib/logger";
import type { InAppContent } from "../../events/types";

const logger = createLogger("notification:channel:inapp:store");

// =============================================================================
// In-App Store
//
// All Prisma operations for the notifications table. This is the ONLY place
// that reads/writes InApp notification rows. Workers import from here.
// =============================================================================

export interface InsertParams {
  recipientUserId: string;
  eventType:       string;
  content:         InAppContent;
}

/**
 * Insert a new IN_APP notification row.
 * Returns the new row's id (used for dedup tracking).
 */
export async function insert(params: InsertParams): Promise<string> {
  const { recipientUserId, eventType, content } = params;

  const row = await db.notification.create({
    data: {
      recipientUserId,
      actorId:    content.actorId ?? null,
      entityType: content.entityType,
      entityId:   content.entityId,
      category:   "general",
      data: {
        type:      eventType,
        title:     content.title,
        body:      content.body,
        actionUrl: content.actionUrl,
      },
      isRead:     false,
      isArchived: false,
    },
    select: { id: true },
  });

  logger.debug("Notification row inserted", {
    id:             row.id,
    recipientUserId,
    eventType,
  });

  return row.id;
}

/**
 * Mark a single notification as read.
 * Returns false if the row doesn't belong to the user (auth guard).
 */
export async function markRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const updated = await db.notification.updateMany({
    where: { id: notificationId, recipientUserId: userId, isRead: false },
    data:  { isRead: true },
  });
  return updated.count > 0;
}

/**
 * Mark ALL unread notifications as read for a user.
 * Returns count of rows updated.
 */
export async function markAllRead(userId: string): Promise<number> {
  const result = await db.notification.updateMany({
    where: { recipientUserId: userId, isRead: false },
    data:  { isRead: true },
  });
  return result.count;
}

/**
 * Archive (soft-delete) notifications older than `olderThanDays` for a user.
 */
export async function archiveOld(
  userId: string,
  olderThanDays: number
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const result = await db.notification.updateMany({
    where: {
      recipientUserId: userId,
      isArchived:      false,
      createdAt:       { lt: cutoff },
    },
    data: { isArchived: true },
  });
  return result.count;
}

/**
 * Check if a notification row already exists for this recipient + entity + type.
 * Used by the dedup guard before insertion.
 */
export async function exists(params: {
  recipientUserId: string;
  entityType:      string;
  entityId:        string;
  eventType:       string;
}): Promise<boolean> {
  const row = await db.notification.findFirst({
    where: {
      recipientUserId: params.recipientUserId,
      entityType:      params.entityType,
      entityId:        params.entityId,
      data:            { path: ["type"], equals: params.eventType },
    },
    select: { id: true },
  });
  return row !== null;
}
