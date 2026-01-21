import { z } from "zod";
import { createThreadSchema } from "./schema";

export type CreateThreadInput = z.infer<typeof createThreadSchema>;
