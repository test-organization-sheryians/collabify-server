import { z } from "zod";
import { getWorkspaceBoardsSchema } from "./schema";

export type GetWorkspaceBoardsInput = z.infer<typeof getWorkspaceBoardsSchema>;
