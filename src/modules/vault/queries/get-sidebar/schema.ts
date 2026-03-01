import { z } from "zod";

export const getVaultSidebarSchema = z.object({
  projectId: z.string().cuid(),
});

export type GetVaultSidebarInput = z.infer<typeof getVaultSidebarSchema>;
