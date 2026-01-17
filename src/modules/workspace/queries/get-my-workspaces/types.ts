import { z } from "zod";
import { GetMyWorkspacesSchema } from "./schema";

export type GetMyWorkspacesInput = z.infer<typeof GetMyWorkspacesSchema>;
