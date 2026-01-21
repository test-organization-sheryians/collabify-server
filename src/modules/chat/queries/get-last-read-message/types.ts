import { z } from "zod";
import { getLastReadMessageSchema } from "./schema";

export type GetLastReadMessageInput = z.infer<typeof getLastReadMessageSchema>;
