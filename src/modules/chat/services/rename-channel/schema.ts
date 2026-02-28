import { z } from "zod";

export const renameChannelSchema = z.object({
  channelId: z.string().cuid(),
  name: z.string().trim().min(1).max(100),
});

export type RenameChannelInput = z.infer<typeof renameChannelSchema>;
