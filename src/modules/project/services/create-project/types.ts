import { z } from "zod";
import { CreateProjectSchema } from "./schema";

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
