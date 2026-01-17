import { z } from "zod";
import { CreateWorkspaceSchema } from "./schema";

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
