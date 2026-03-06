import { z } from "zod";

export const MarkAllNotificationsReadSchema = z.object({
  actorUserId: z.string().uuid(),
});
