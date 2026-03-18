import { z } from "zod";
import { lockBoardSchema } from "./schema";

export type LockBoardInput = z.infer<typeof lockBoardSchema>;
