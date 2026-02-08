import { z } from "zod";
import { renameBoardSchema } from "./schema";

export type RenameBoardInput = z.infer<typeof renameBoardSchema>;
