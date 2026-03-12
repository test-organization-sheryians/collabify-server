import type { Redis } from "ioredis";
import { keys } from "../cache/keys";

export async function invalidateBoardCollaborator(
  boardId: string,
  userId: string,
  redis: Redis
): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.del(keys.boardCollab(boardId, userId));
  pipeline.del(keys.boardState(boardId));
  await pipeline.exec();
}

export async function invalidateBoardState(
  boardId: string,
  redis: Redis
): Promise<void> {
  await redis.del(keys.boardState(boardId));
}
