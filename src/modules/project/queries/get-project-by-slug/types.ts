import { z } from "zod";
import { GetProjectBySlugSchema } from "./schema";

export type GetProjectBySlugInput = z.infer<typeof GetProjectBySlugSchema>;
