import { z } from "zod";
import { getProjectBoardsSchema } from "./schema";

export type GetProjectBoardsInput = z.infer<typeof getProjectBoardsSchema>;
