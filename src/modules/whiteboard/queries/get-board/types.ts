import { z } from "zod";
import { getBoardSchema } from "./schema";

export type GetBoardInput = z.infer<typeof getBoardSchema>;
