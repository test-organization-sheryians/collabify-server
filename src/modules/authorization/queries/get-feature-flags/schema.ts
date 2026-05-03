import { z } from "zod";

export const GetFeatureFlagsSchema = z.object({
  actorUserId: z.string().min(1),
});

export type GetFeatureFlagsInput = z.infer<typeof GetFeatureFlagsSchema>;
