import { z } from "zod";
import { SyncUserSchema } from "./schema";

export type SyncUserInput = z.infer<typeof SyncUserSchema>;
