import { z } from "zod";
import { getChannelMessagesSchema } from "./schema";

export type GetChannelMessagesInput = z.infer<typeof getChannelMessagesSchema>;
