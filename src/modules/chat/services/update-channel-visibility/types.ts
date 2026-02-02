import { z } from "zod";
import { updateChannelVisibilitySchema } from "./schema";

export type UpdateChannelVisibilityInput = z.infer<
  typeof updateChannelVisibilitySchema
>;

export type UpdateChannelVisibilityOutput = {
  success: boolean;
  channelId: string;
  isPublic: boolean;
};
