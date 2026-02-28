import { z } from "zod";

export const archiveChannelSchema = z.object({
  channelId: z.string().cuid(),
});

export type ArchiveChannelInput = z.infer<typeof archiveChannelSchema>;
