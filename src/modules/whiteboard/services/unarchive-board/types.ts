import { z } from "zod";
import { unarchiveBoardSchema } from "./schema";

export type UnarchiveBoardInput = z.infer<typeof unarchiveBoardSchema>;
