import { z } from "zod";
export const getPageCollaboratorsSchema = z.object({
  pageId: z.string().cuid(),
});
export type GetPageCollaboratorsInput = z.infer<
  typeof getPageCollaboratorsSchema
>;
export { typeDefs } from "./type-defs";
export { getPageCollaboratorsHandler as handler } from "./handler";
export { getPageCollaboratorsSchema as schema };
