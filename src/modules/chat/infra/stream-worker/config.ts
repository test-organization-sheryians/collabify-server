import * as os from "os";

export const WORKER_GROUP_NAME = "chat-workers:v1";

export function getConsumerName(): string {
  return `worker-${os.hostname()}-${process.pid}`;
}

export const BATCH_COUNT = 10;
export const BLOCK_MS = 2000;
export const HEARTBEAT_INTERVAL_MS = 5000;
export const RECOVERY_LOOP_INTERVAL_MS = 60000;
export const IDLE_THRESHOLD_MS = 60000;
export const DLQ_KEY = "stream-worker:dlq";