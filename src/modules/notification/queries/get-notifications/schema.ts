import { z } from "zod";

export const GetNotificationsSchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
  filter: z
    .object({
      isRead: z.boolean().optional(),
    })
    .optional(),
});
