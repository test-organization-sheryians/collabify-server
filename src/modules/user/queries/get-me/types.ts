import { z } from "zod";
import { GetMeSchema } from "./schema";

export type GetMeInput = z.infer<typeof GetMeSchema>;
