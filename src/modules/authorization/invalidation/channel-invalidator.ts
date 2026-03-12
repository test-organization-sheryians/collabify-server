import type { Redis } from "ioredis";
import { keys } from "../cache/keys";

export async function invalidateChannelMember(
  channelId: string,
  userId: string,
  redis: Redis
): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.del(keys.channelMember(channelId, userId));
  pipeline.del(keys.channelState(channelId));
  await pipeline.exec();
}
