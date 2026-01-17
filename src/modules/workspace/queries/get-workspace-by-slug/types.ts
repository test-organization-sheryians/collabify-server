import { z } from "zod";
import { GetWorkspaceBySlugSchema } from "./schema";

export type GetWorkspaceBySlugInput = z.infer<typeof GetWorkspaceBySlugSchema>;
