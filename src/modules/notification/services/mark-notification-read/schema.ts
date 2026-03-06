import { z } from "zod";

export const MarkNotificationReadSchema = z.object({
  ids: z.array(z.string().min(1, "ID required")),
  actorUserId: z.string().uuid().optional(),
});
