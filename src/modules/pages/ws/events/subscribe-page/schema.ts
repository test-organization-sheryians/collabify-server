import { z } from "zod";

export const subscribePageSchema = z.object({
  pageId: z.string().cuid(),
  /**
   * The last stream entry ID the client processed.
   * '0-0' = first open (no gap-fill, client just fetched snapshot via GraphQL).
   * Anything else = reconnect (handler sends XRANGE from lastStreamId onwards).
   */
  lastStreamId: z.string().optional().default("0-0"),
});

export type SubscribePageInput = z.infer<typeof subscribePageSchema>;
