import { z } from "zod";
import { deleteChannelSchema } from "./schema";

export type DeleteChannelInput = z.infer<typeof deleteChannelSchema>;

export type DeleteChannelOutput = {
  success: boolean;
  channelId: string;
};
