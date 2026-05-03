import { z } from "zod";

export const getVaultUsageSchema = z.object({
  projectId: z.string().cuid(),
});

export type GetVaultUsageInput = z.infer<typeof getVaultUsageSchema>;
