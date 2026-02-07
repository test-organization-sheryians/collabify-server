import { ChatWebSocket } from "./types";
import { redisSubscriber } from "./redis-subscriber";
import { logger } from "../../shared/logger";

/**
 * In-Memory Subscription Registry with Redis Reference Counting
 *
 * SCOPE: Per-Node (Not distributed)
 * PURPOSE: Quick lookups for fan-out + managing Redis Subscriptions
 */

// Core Map: Topic -> Set of Socket IDs
const topicSubs = new Map<string, Set<string>>();

// Ref Count: Topic -> Number of local interested sockets
const topicRefCounts = new Map<string, number>();

// Topic Locks: Topic -> Promise<void> (Mutex)
const topicLocks = new Map<string, Promise<void>>();

// Reverse Index: SocketId -> Set of Topics
const socketIndex = new Map<
  string,
  {
    userId: string;
    topics: Set<string>;
    lastActive: number;
  }
>();

// User Index: UserId -> Set of Socket IDs (For multi-tab/device)
const userSockets = new Map<string, Set<string>>();

// Global Registry: SocketId -> Socket Object (For actual sending)
const globalSocketMap = new Map<string, ChatWebSocket>();

/**
 * Simple Mutex logic to serialize topic operations
 * Uses Promise Chaining for FIFO ordering
 */
const withTopicLock = async (topic: string, action: () => Promise<void>) => {
  // 1. Get current tail of the chain
  const prevPromise = topicLocks.get(topic) || Promise.resolve();

  // 2. Create the completion signal for THIS operation
  let unlock: () => void;
  const myPromise = new Promise<void>((resolve) => {
    unlock = resolve;
  });

  // 3. Register ourselves as the new tail IMMEDIATELY
  // Subsequent callers will wait for 'myPromise'
  topicLocks.set(topic, myPromise);

  try {
    // 4. Wait for our turn (ignoring errors from previous operations)
    await prevPromise.catch(() => {});

    // 5. Execute critical section
    await action();
  } finally {
    // 6. Signal completion to the next waiter
    if (unlock!) unlock();

    // 7. Cleanup: If we are still the tail, the queue is empty
    if (topicLocks.get(topic) === myPromise) {
      topicLocks.delete(topic);
    }
  }
};

export const wsRegistry = {
  /**
   * Initialize Registry (Janitor Scheduler)
   */
  init() {
    setInterval(() => {
      this.cleanZombies().catch((err) => {
        logger.error({ err }, "WS Registry Janitor Failed");
      });
    }, 60000); // Run every 60s
    logger.info("WS Registry: Janitor Scheduled");
  },

  /**
   * Called on WS Open
   */
  startSession(socket: ChatWebSocket) {
    const { socketId, userId } = socket.data;

    globalSocketMap.set(socketId, socket);

    socketIndex.set(socketId, {
      userId,
      topics: new Set(),
      lastActive: Date.now(),
    });

    let uSockets = userSockets.get(userId);
    if (!uSockets) {
      uSockets = new Set();
      userSockets.set(userId, uSockets);
    }
    uSockets.add(socketId);
  },

  /**
   * Update Last Active Timestamp
   */
  touch(socketId: string) {
    const entry = socketIndex.get(socketId);
    if (entry) {
      entry.lastActive = Date.now();
    }
  },

  /**
   * Called on WS Close
   * FIX: Now async/await to ensure cleanup finishes
   */
  async endSession(socketId: string) {
    const entry = socketIndex.get(socketId);
    if (!entry) return;

    const { userId, topics } = entry;

    // 1. Unsubscribe from all topics (decrements refCounts)
    // FIX: Parallel execution with Promise.all
    await Promise.all(
      [...topics].map((topic) => this.unsubscribe(socketId, topic))
    );

    // 2. Remove from User Index
    const uSockets = userSockets.get(userId);
    if (uSockets) {
      uSockets.delete(socketId);
      if (uSockets.size === 0) userSockets.delete(userId);
    }

    // 3. Cleanup Core Maps
    socketIndex.delete(socketId);
    globalSocketMap.delete(socketId);
  },

  /**
   * Subscribe Socket to ANY Topic (Updates RefCount)
   * FIX: Wrapped in Mutex
   */
  async subscribe(socketId: string, topic: string) {
    await withTopicLock(topic, async () => {
      const entry = socketIndex.get(socketId);
      if (!entry) return;

      // Prevent double-subscription
      if (entry.topics.has(topic)) return;

      // Add to Local Maps
      let set = topicSubs.get(topic);
      if (!set) {
        set = new Set();
        topicSubs.set(topic, set);
      }
      set.add(socketId);
      entry.topics.add(topic);

      // Update RefCount & Trigger Redis Subscribe
      const currentCount = topicRefCounts.get(topic) || 0;
      const newCount = currentCount + 1;
      topicRefCounts.set(topic, newCount);

      if (newCount === 1) {
        await redisSubscriber.subscribe(topic);
      }
    });
  },

  /**
   * Unsubscribe Socket from ANY Topic (Updates RefCount)
   * FIX: Wrapped in Mutex
   */
  async unsubscribe(socketId: string, topic: string) {
    await withTopicLock(topic, async () => {
      const entry = socketIndex.get(socketId);
      if (!entry) return;
      if (!entry.topics.has(topic)) return;

      // Remove from Local Maps
      const set = topicSubs.get(topic);
      if (set) {
        set.delete(socketId);
        if (set.size === 0) topicSubs.delete(topic);
      }
      entry.topics.delete(topic);

      // Update RefCount & Trigger Redis Unsubscribe
      const currentCount = topicRefCounts.get(topic) || 0;
      if (currentCount > 0) {
        const newCount = currentCount - 1;
        topicRefCounts.set(topic, newCount);

        if (newCount === 0) {
          topicRefCounts.delete(topic);
          await redisSubscriber.unsubscribe(topic);
        }
      }
    });
  },

  /**
   * Receiver for Redis Pub/Sub Messages (The Fan-Out)
   * FIX: Added Backpressure Guard
   */
  dispatch(topic: string, message: string) {
    const ids = topicSubs.get(topic);
    if (!ids || ids.size === 0) return;

    for (const id of ids) {
      const socket = globalSocketMap.get(id);

      // FIX: Check Open State AND Backpressure
      if (socket && socket.readyState === 1) {
        // 10KB Buffer Limit
        // Cast to any because bufferedAmount is missing in Bun Type definitions but exists at runtime
        if ((socket as any).bufferedAmount > 10240) {
          // Drop message to save server memory (Client must resync)
          // logger.warn({ socketId: id }, "Dropped message due to backpressure");
          continue;
        }
        socket.send(message);
      }
    }
  },

  /**
   * Zombie Janitor
   * Removes sockets that are not OPEN
   */
  async cleanZombies() {
    for (const [socketId, socket] of globalSocketMap) {
      if (socket.readyState !== 1) {
        // 1 = OPEN
        await this.endSession(socketId);
      }
    }
  },

  /**
   * Get all sockets for a User (Multi-tab broadcast)
   */
  getUserSockets(userId: string): ChatWebSocket[] {
    const ids = userSockets.get(userId);
    if (!ids) return [];

    const sockets: ChatWebSocket[] = [];
    for (const id of ids) {
      const socket = globalSocketMap.get(id);
      if (socket) sockets.push(socket);
    }
    return sockets;
  },

  getMetrics() {
    return {
      activeSockets: globalSocketMap.size,
      activeUsers: userSockets.size,
      activeTopics: topicSubs.size,
      redisSubscriptions: topicRefCounts.size,
    };
  },
};
