import { z } from "zod";

export const getPageCollaboratorsSchema = z.object({
  pageId: z.string().cuid(),
});

export type GetPageCollaboratorsInput = z.infer<
  typeof getPageCollaboratorsSchema
>;
