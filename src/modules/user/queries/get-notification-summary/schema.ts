import { z } from "zod";

export const GetNotificationSummarySchema = z.object({
  userId: z.string(),
});

export type GetNotificationSummaryInput = z.infer<typeof GetNotificationSummarySchema>;
