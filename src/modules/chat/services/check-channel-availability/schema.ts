import { z } from "zod";

export const CheckChannelAvailabilitySchema = z.object({
  projectId: z.string().cuid(),
  slug: z.string().min(1).max(100),
});
