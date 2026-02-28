import { redis } from "./redis";

/**
 * Strict Stream Key Typing
 * Invariant: All chat streams MUST follow `stream:channel:{channelId}` format.
 */
export const xaddSafe = async (
  channelId: string,
  data: Record<string, string | number>
): Promise<string> => {
  const streamKey = `stream:channel:${channelId}`;

  // Flatten data for Redis XADD (args must be strings)
  const args: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    args.push(k, String(v));
  }

  // XADD key * data...
  const id = await redis.xadd(streamKey, "*", ...args);
  if (!id) {
    throw new Error(`Failed to append to stream ${streamKey}`);
  }
  return id;
};
