import { z } from "zod";
export const removePageCollaboratorSchema = z.object({
  pageId: z.string().cuid(),
  userId: z.string().cuid(),
});
export type RemovePageCollaboratorInput = z.infer<
  typeof removePageCollaboratorSchema
>;
