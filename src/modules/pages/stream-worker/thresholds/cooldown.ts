import { createLogger } from "@/shared/lib/logger";
import { PageKeys } from "../../infra/page-keys";
import { SNAPSHOT_COOLDOWN_MS } from "../config";
import type {
  ThresholdChecker,
  ThresholdContext,
  ThresholdConfig,
} from "./index";
import type { Redis } from "ioredis";

const logger = createLogger("pages:stream-worker:threshold:cooldown");

// Ephemeral Redis key: cached timestamp of last snapshot (avoids DB read on every cycle)
const LAST_SNAPSHOT_KEY = (pageId: string) =>
  PageKeys.PageSnapshotLastAt(pageId);

/**
 * CooldownThreshold — triggers snapshot when enough time has passed since the
 * last snapshot AND the stream is non-empty.
 *
 * WHY: StreamLengthThreshold catches burst writes. CooldownThreshold catches
 * slow-but-constant pages that never quite reach SNAPSHOT_THRESHOLD entries.
 * Together they ensure compaction happens on both high-frequency and low-frequency edits.
 *
 * Last-snapshot time is cached in Redis (SET on each rebuild) to avoid a DB
 * query on every cycle. Falls back to 0 (epoch) if key is missing, which
 * immediately triggers a snapshot — correct for first-ever snapshot.
 */
export class CooldownThreshold implements ThresholdChecker {
  readonly name = "cooldown";

  constructor(
    private readonly cooldownMs: number = SNAPSHOT_COOLDOWN_MS,
    private readonly enabled: boolean = true
  ) {}

  async evaluate(ctx: ThresholdContext): Promise<boolean> {
    try {
      // Fast path — Redis cached timestamp
      const cached = await ctx.redis.get(LAST_SNAPSHOT_KEY(ctx.pageId));
      const lastSnapshotAt = cached ? parseInt(cached, 10) : 0;

      // No point snapshotting an empty stream
      const streamKey = PageKeys.PageStream(ctx.pageId);
      const streamLen = await ctx.redis.xlen(streamKey);
      if (streamLen === 0) return false;

      const elapsed = Date.now() - lastSnapshotAt;
      const shouldTrigger = elapsed >= this.cooldownMs;

      if (shouldTrigger) {
        logger.info("Cooldown threshold met", {
          pageId: ctx.pageId,
          elapsedMs: elapsed,
          cooldownMs: this.cooldownMs,
          streamLen,
        });
      } else {
        logger.debug("Cooldown threshold check", {
          pageId: ctx.pageId,
          elapsedMs: elapsed,
          cooldownMs: this.cooldownMs,
          remainingMs: this.cooldownMs - elapsed,
        });
      }

      return shouldTrigger;
    } catch (err) {
      logger.error("Cooldown check failed — skipping trigger", {
        pageId: ctx.pageId,
        err,
      });
      return false;
    }
  }

  /**
   * Called by rebuildPageSnapshot after a successful snapshot to reset the cooldown.
   */
  static async recordSnapshot(pageId: string, redis: Redis): Promise<void> {
    // TTL = cooldown * 2 — key can safely expire if page goes idle
    const ttl = Math.ceil((SNAPSHOT_COOLDOWN_MS * 2) / 1000);
    await redis.set(
      LAST_SNAPSHOT_KEY(pageId),
      Date.now().toString(),
      "EX",
      ttl
    );
  }

  getConfig(): ThresholdConfig & { cooldownMs: number } {
    return {
      enabled: this.enabled,
      name: this.name,
      description: `Trigger snapshot if cooldown >= ${this.cooldownMs}ms and stream is non-empty`,
      cooldownMs: this.cooldownMs,
    };
  }
}
