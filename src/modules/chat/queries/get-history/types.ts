import { z } from "zod";
import { GetHistoryInputSchema } from "./schema";

export type GetHistoryInput = z.infer<typeof GetHistoryInputSchema>;
