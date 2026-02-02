import { z } from "zod";

/**
 * Delete Channel Schema
 *
 * Permanently deletes a channel. Channel must be archived first.
 * Only workspace admins or channel creators can delete channels.
 */
export const deleteChannelSchema = z.object({
  workspaceId: z.string().cuid(),
  channelId: z.string().cuid(),
});
