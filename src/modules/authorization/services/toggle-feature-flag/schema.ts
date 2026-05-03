import { z } from "zod";

export const ToggleFeatureFlagSchema = z.object({
  flagKey: z.string().min(1),
  contextType: z.enum(["USER", "PROJECT", "WORKSPACE", "GLOBAL"]),
  contextId: z.string().optional(), // null/undefined for GLOBAL override
  enabled: z.boolean(),
  actorUserId: z.string().min(1),
});

export type ToggleFeatureFlagInput = z.infer<typeof ToggleFeatureFlagSchema>;
