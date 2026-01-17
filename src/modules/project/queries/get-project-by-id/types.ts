import { z } from "zod";
import { GetProjectByIdSchema } from "./schema";

export type GetProjectByIdInput = z.infer<typeof GetProjectByIdSchema>;
