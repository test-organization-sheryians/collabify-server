import { z } from "zod";
import { getChannelMembersSchema } from "./schema";

export type GetChannelMembersInput = z.infer<typeof getChannelMembersSchema>;
