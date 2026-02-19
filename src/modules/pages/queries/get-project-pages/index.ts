import { z } from "zod";
export const getProjectPagesSchema = z.object({ projectId: z.string().cuid() });
export type GetProjectPagesInput = z.infer<typeof getProjectPagesSchema>;
export { typeDefs } from "./type-defs";
export { getProjectPagesHandler as handler } from "./handler";
export { getProjectPagesSchema as schema };
