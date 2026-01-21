import { z } from "zod";

// Basic schema for JSON content validation (extensible)
const contentSchema = z.record(z.string(), z.any());

export const createThreadSchema = z.object({
  channelId: z.string().cuid(),
  parentMessageId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, "Invalid ULID"),
  content: contentSchema,
  nonce: z.string().optional(),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;
