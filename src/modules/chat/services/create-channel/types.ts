import { z } from "zod";
import { createChannelSchema } from "./schema";

export type CreateChannelInput = z.infer<typeof createChannelSchema>;
