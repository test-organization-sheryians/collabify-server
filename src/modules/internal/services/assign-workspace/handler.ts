import { redis } from "@/infra/redis";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/logger";
import { Context } from "hono";

interface AssignWorkspaceInput {
  workspaceId: string;
}

export const assignWorkspace = async (
  input: AssignWorkspaceInput,
  _ctx: Context
) => {
  const { workspaceId } = input;

  // Use configured host or fallback to Docker Gateway for logic
  const assignedServer = env.ASSIGNMENT_SERVER_HOST;

  const key = `workspace:${workspaceId}:server`;

  try {
    // Concurrency Safe Assignment: Try to set only if not exists (NX)
    await redis.set(key, assignedServer, "EX", 86400, "NX");

    // Read back the authoritative source of truth
    const finalServer = await redis.get(key);

    return { server: finalServer };
  } catch (err) {
    logger.error({ err, msg: "Failed to persist assignment to Redis" });
    throw err;
  }
};
