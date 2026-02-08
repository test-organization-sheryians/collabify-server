import { z } from "zod";
import { unlockBoardSchema } from "./schema";

export type UnlockBoardInput = z.infer<typeof unlockBoardSchema>;
