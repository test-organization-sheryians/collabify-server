import { appRedis } from "../redis";
import { logger } from "@/shared/logger";
import { KeyFactory } from "../redis/keys";
import crypto, { createHash } from "node:crypto";

/**
 * Worker Coordinator ("The Brain")
 * Responsible for assigning Active Streams (Channels) to Workers.
 *
 * V2 HARDENED (Phase L)
 */
const COORDINATOR_ID = crypto.randomUUID();

// Configuration
const CONVERSATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours Idle TTL

export const workerCoordinator = {
  isRunning: false,
  intervalId: null as Timer | null,

  // State for Event-Driven Rebalance
  lastWorkerIds: [] as string[],
  lastConversationEpoch: 0,

  // NOTE: lastAssignmentHashes removed in favor of Durable Redis State (L.2)

  async init() {
    this.isRunning = true;
    logger.info(
      { coordinatorId: COORDINATOR_ID },
      "Starting Worker Coordinator (Hardened)"
    );
    this.startLoop();
  },

  startLoop() {
    this.intervalId = setInterval(() => this.tick(), 1000); // 1s Heartbeat
  },

  /**
   * Main Control Loop (Tick)
   */
  async tick() {
    try {
      // 1. Leadership Fencing (Atomic)
      const isLeader = await this.ensureLeadership();
      if (!isLeader) return;

      const now = Date.now();

      // 2. Lifecycle Management (L.3)
      // Prune Stale Conversations (ZSET)
      await appRedis.zremrangebyscore(
        KeyFactory.ActiveConversations,
        "-inf",
        now - CONVERSATION_TTL_MS
      );

      // Prune Zombies
      await appRedis.zremrangebyscore(
        KeyFactory.WorkerRegistry,
        "-inf",
        now - 30000
      );

      // 3. Event Detection
      const workers = await appRedis.zrangebyscore(
        KeyFactory.WorkerRegistry,
        now - 10000,
        "+inf"
      );

      const sortedWorkers = workers.sort(); // Deterministic order
      const workersChanged =
        JSON.stringify(sortedWorkers) !== JSON.stringify(this.lastWorkerIds);

      // Check B: Conversation Epoch Change
      const currentConversationEpochStr = await appRedis.get(
        KeyFactory.EpochConversations
      );
      const currentConversationEpoch = parseInt(
        currentConversationEpochStr || "0",
        10
      );
      const conversationsChanged =
        currentConversationEpoch > this.lastConversationEpoch;

      if (!workersChanged && !conversationsChanged) {
        return;
      }

      // 4. Rebalance Triggered
      logger.info(
        { workersChanged, conversationsChanged, currentConversationEpoch },
        "Coordinator: Rebalance Triggered"
      );

      await this.performRebalance(sortedWorkers);

      // 5. Update State
      this.lastWorkerIds = sortedWorkers;
      this.lastConversationEpoch = currentConversationEpoch;
    } catch (err) {
      logger.error({ err }, "Coordinator: Tick Failed");
    }
  },

  async ensureLeadership(): Promise<boolean> {
    const lockKey = KeyFactory.CoordinatorLock;

    // Attempt Acquire (NX)
    const acquired = await appRedis.set(
      lockKey,
      COORDINATOR_ID,
      "PX",
      3000,
      "NX"
    );
    if (acquired === "OK") return true;

    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    const renewed = await appRedis.eval(
      luaScript,
      1,
      lockKey,
      COORDINATOR_ID,
      3000
    );
    return renewed === 1;
  },

  /**
   * core Logic: Rendezvous Hash + Durable Hashes
   */
  async performRebalance(workers: string[]) {
    // 1. Fetch Active Conversations (ZRANGE instead of SMEMBERS) (L.3)
    const activeConversations = await appRedis.zrange(
      KeyFactory.ActiveConversations,
      0,
      -1
    );

    if (activeConversations.length === 0 || workers.length === 0) return;

    // 2. Calculate Assignments
    const assignments: Record<string, string[]> = {};
    workers.forEach((w) => (assignments[w] = []));

    for (const conversationId of activeConversations) {
      const assignedWorker = this.rendezvousHash(conversationId, workers);
      if (assignedWorker) {
        assignments[assignedWorker].push(conversationId);
      }
    }

    // 3. Apply Assignments with Durable Diffing (L.2)
    for (const [workerId, channels] of Object.entries(assignments)) {
      const assignmentKey = KeyFactory.WorkerAssignment(workerId);
      const hashKey = KeyFactory.AssignmentHash(workerId);

      channels.sort();
      const newHash = createHash("md5")
        .update(JSON.stringify(channels))
        .digest("hex");

      const lastHash = await appRedis.get(hashKey); // DURABLE read

      if (lastHash === newHash) {
        continue;
      }

      if (channels.length > 0) {
        await appRedis
          .multi()
          .del(assignmentKey)
          .sadd(assignmentKey, ...channels)
          .set(hashKey, newHash) // DURABLE write
          .exec();
      } else {
        await appRedis.multi().del(assignmentKey).del(hashKey).exec();
      }
    }
  },

  rendezvousHash(item: string, nodes: string[]): string | null {
    if (nodes.length === 0) return null;
    let maxWeight = -1;
    let selectedNode = null;
    for (const node of nodes) {
      const hash = createHash("md5").update(`${item}:${node}`).digest("hex");
      const weight = parseInt(hash.substring(0, 12), 16);
      if (weight > maxWeight) {
        maxWeight = weight;
        selectedNode = node;
      }
    }
    return selectedNode;
  },

  stop() {
    this.isRunning = false;
    if (this.intervalId) clearInterval(this.intervalId);
  },
};
