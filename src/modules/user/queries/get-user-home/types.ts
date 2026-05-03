import { z } from "zod";
import { GetUserHomeSchema } from "./schema";

export type GetUserHomeInput = z.infer<typeof GetUserHomeSchema>;
