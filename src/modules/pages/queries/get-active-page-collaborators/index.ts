import { z } from "zod";
export const getActivePageCollaboratorsSchema = z.object({
  pageId: z.string().cuid(),
});
export type GetActivePageCollaboratorsInput = z.infer<
  typeof getActivePageCollaboratorsSchema
>;
export { typeDefs } from "./type-defs";
export { getActivePageCollaboratorsHandler as handler } from "./handler";
export { getActivePageCollaboratorsSchema as schema };
