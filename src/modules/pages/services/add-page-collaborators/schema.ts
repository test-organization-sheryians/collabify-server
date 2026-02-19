import { z } from "zod";
export const addPageCollaboratorsSchema = z.object({
  pageId: z.string().cuid(),
  collaborators: z
    .array(
      z.object({
        userId: z.string().cuid(),
        role: z.enum(["EDITOR", "VIEWER", "COMMENTER"]),
      })
    )
    .min(1)
    .max(50),
});
export type AddPageCollaboratorsInput = z.infer<
  typeof addPageCollaboratorsSchema
>;
