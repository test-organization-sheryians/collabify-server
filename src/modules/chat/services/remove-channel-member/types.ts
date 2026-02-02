import { z } from "zod";
import { removeChannelMemberSchema } from "./schema";

export type RemoveChannelMemberInput = z.infer<
  typeof removeChannelMemberSchema
>;

export type RemoveChannelMemberOutput = {
  success: boolean;
  channelId: string;
  userId: string;
};
