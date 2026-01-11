import { z } from "zod";

export const GetNotificationsSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  filter: z
    .object({
      isRead: z.boolean().optional(),
    })
    .optional(),
});

export const MarkReadSchema = z.object({
  userId: z.string().min(1),
  notificationIds: z.array(z.string().min(1)).min(1),
});

export const MarkAllReadSchema = z.object({
  userId: z.string().min(1),
});

// Runtime Schema for Persisted Notification Data
// Matches InAppJobData + { type } injected by worker
export const NotificationDataSchema = z
  .object({
    type: z.string(),
    eventId: z.string(),
    userId: z.string(),
    message: z.string(),
    link: z.string().optional(),
    avatarUrl: z.string().optional(),
  })
  .passthrough(); // Allow forward compatibility

export type NotificationData = z.infer<typeof NotificationDataSchema>;
