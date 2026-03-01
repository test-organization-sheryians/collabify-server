import { z } from "zod";

export const getVaultNodeSchema = z.object({
  id: z.string().cuid(),
  type: z.enum(["FOLDER", "FILE"]),
});

export type GetVaultNodeInput = z.infer<typeof getVaultNodeSchema>;
