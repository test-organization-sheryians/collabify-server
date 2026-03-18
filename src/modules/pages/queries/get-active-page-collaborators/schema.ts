import { z } from "zod";

export const getActivePageCollaboratorsSchema = z.object({
  pageId: z.string().cuid(),
});

export type GetActivePageCollaboratorsInput = z.infer<
  typeof getActivePageCollaboratorsSchema
>;
