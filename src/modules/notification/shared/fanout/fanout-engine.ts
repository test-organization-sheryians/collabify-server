import { fanoutQueue } from "../queues/queue-registry";
import { FANOUT } from "../../constants";
import { createLogger } from "@/shared/lib/logger";
import type { Recipient, FanoutJobData } from "../../events/types";

// =============================================================================
// Fan-out Engine
//
// Handles broadcast delivery to N recipients.
// Rather than the Decider processing all N recipients inline (blocking),
// it dispatches FanoutQueue jobs for chunks of 50. The FanoutWorker then
// re-queues individual DeciderQueue jobs per recipient.
//
// This keeps the Decider fast and allows fan-out to scale horizontally.
// =============================================================================

const logger = createLogger("notification:shared:fanout");

/**
 * Dispatch a fan-out: split recipients into chunks and enqueue a FanoutQueue
 * job per chunk. Returns the number of chunks dispatched.
 */
export async function dispatch(params: {
  eventId:    string;
  type:       string;
  payload:    Record<string, unknown>;
  recipients: Recipient[];
  nextCursor?: string;
}): Promise<number> {
  const chunks = chunkArray(params.recipients, FANOUT.CHUNK_SIZE);

  logger.debug("Fan-out engine: dispatching", {
    eventId:    params.eventId,
    type:       params.type,
    recipients: params.recipients.length,
    chunks:     chunks.length,
  });

  const jobs = chunks.map((chunk, i) => {
    const jobData: FanoutJobData = {
      eventId:    params.eventId,
      type:       params.type,
      payload:    params.payload,
      recipients: chunk,
      nextCursor: i === chunks.length - 1 ? params.nextCursor : undefined,
    };

    return {
      name: `fanout:${params.eventId}:chunk:${i}`,
      data: jobData,
    };
  });

  await fanoutQueue.addBulk(jobs);
  return chunks.length;
}

// -----------------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------------

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
