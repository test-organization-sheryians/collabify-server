import { z } from "zod";

export const getProjectPagesSchema = z.object({
  projectId: z.string().cuid(),
});

export type GetProjectPagesInput = z.infer<typeof getProjectPagesSchema>;
