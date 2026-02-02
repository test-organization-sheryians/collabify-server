import { z } from "zod";
import { unarchiveChannelSchema } from "./schema";

export type UnarchiveChannelInput = z.infer<typeof unarchiveChannelSchema>;

export type UnarchiveChannelOutput = {
  success: boolean;
  channelId: string;
  name: string;
};
