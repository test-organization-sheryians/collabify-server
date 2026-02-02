import { z } from "zod";
import { updateChannelDescriptionSchema } from "./schema";

export type UpdateChannelDescriptionInput = z.infer<
  typeof updateChannelDescriptionSchema
>;

export type UpdateChannelDescriptionOutput = {
  success: boolean;
  channelId: string;
  description: string | null;
};
