import { z } from "zod";

export const unarchiveChannelSchema = z.object({
  workspaceId: z.string().cuid(),
  channelId: z.string().cuid(),
});
