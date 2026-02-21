import type { Redis } from "ioredis";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("pages:stream-worker:threshold-registry");

/**
 * Context passed to every ThresholdChecker during evaluation.
 */
export interface ThresholdContext {
  /** Page being evaluated — equivalent to boardId in whiteboard. */
  pageId: string;
  redis: Redis;
}

/**
 * Metadata returned by getConfig().
 */
export interface ThresholdConfig {
  enabled: boolean;
  name: string;
  description: string;
}

/**
 * ThresholdChecker interface — implement to add a new snapshot trigger.
 *
 * ANY enabled threshold returning true triggers a snapshot rebuild.
 * Multiple thresholds run in parallel (Promise.all).
 */
export interface ThresholdChecker {
  readonly name: string;
  evaluate(ctx: ThresholdContext): Promise<boolean>;
  getConfig(): ThresholdConfig;
}

/**
 * ThresholdRegistry — manages all snapshot trigger policies.
 *
 * Design rules:
 *   - ANY threshold met → snapshot triggered (OR logic, not AND)
 *   - Thresholds are evaluated in parallel
 *   - A failing threshold returns false (never blocks other thresholds)
 *   - Register new triggers without modifying worker core code
 */
export class ThresholdRegistry {
  private checkers: Map<string, ThresholdChecker> = new Map();

  register(checker: ThresholdChecker): void {
    this.checkers.set(checker.name, checker);
    logger.info("Registered threshold", {
      name: checker.name,
      config: checker.getConfig(),
    });
  }

  /**
   * Evaluate all enabled thresholds.
   * @returns true if ANY enabled threshold is met.
   */
  async shouldCreateSnapshot(ctx: ThresholdContext): Promise<boolean> {
    const results = await Promise.all(
      Array.from(this.checkers.values())
        .filter((c) => c.getConfig().enabled)
        .map(async (c) => ({
          name: c.name,
          triggered: await c.evaluate(ctx),
        }))
    );

    const triggered = results.filter((r) => r.triggered);

    if (triggered.length > 0) {
      logger.info("Snapshot threshold triggered", {
        pageId: ctx.pageId,
        triggers: triggered.map((t) => t.name),
      });
      return true;
    }

    return false;
  }

  getTriggeredThresholds(ctx: ThresholdContext): Promise<string[]> {
    return this.shouldCreateSnapshot(ctx).then((hit) =>
      hit
        ? Array.from(this.checkers.values())
            .filter((c) => c.getConfig().enabled)
            .map((c) => c.name)
        : []
    );
  }

  getRegisteredThresholds(): ThresholdChecker[] {
    return Array.from(this.checkers.values());
  }
}
