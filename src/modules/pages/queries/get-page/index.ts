import { z } from "zod";
export const getPageSchema = z.object({ pageId: z.string().cuid() });
export type GetPageInput = z.infer<typeof getPageSchema>;
export { typeDefs } from "./type-defs";
export { getPageHandler as handler } from "./handler";
export { getPageSchema as schema };
