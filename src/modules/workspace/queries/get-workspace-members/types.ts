import { z } from "zod";
import { GetWorkspaceMembersSchema } from "./schema";

export type GetWorkspaceMembersInput = z.infer<
  typeof GetWorkspaceMembersSchema
>;
