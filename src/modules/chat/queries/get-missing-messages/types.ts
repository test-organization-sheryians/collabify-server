import { z } from "zod";
import { getMissingMessagesSchema } from "./schema";

export type GetMissingMessagesInput = z.infer<typeof getMissingMessagesSchema>;
