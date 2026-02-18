import { z } from "zod";
import { createBoardSchema } from "./schema";

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
