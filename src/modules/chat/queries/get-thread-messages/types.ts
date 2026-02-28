import { z } from "zod";
import { getThreadMessagesSchema } from "./schema";

export type GetThreadMessagesInput = z.infer<typeof getThreadMessagesSchema>;
