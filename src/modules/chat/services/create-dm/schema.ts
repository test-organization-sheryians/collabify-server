import { z } from "zod";

export const createDmInputSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  recipientUserId: z.string().min(1),
});

export type CreateDmInput = z.infer<typeof createDmInputSchema>;
