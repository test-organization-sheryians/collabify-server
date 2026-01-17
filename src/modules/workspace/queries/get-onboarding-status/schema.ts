import { z } from "zod";

export const GetOnboardingStatusSchema = z.object({
  userId: z.string().min(1),
});
