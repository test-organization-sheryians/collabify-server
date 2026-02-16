import type { Redis } from "ioredis";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("whiteboard:threshold:registry");

/**
 * Context provided to threshold checkers
 */
export interface ThresholdContext {
  boardId: string;
  redis: Redis;
  s3Client: any; // S3 client instance
}

/**
 * Configuration for a threshold
 */
export interface ThresholdConfig {
  enabled: boolean;
  name: string;
  description: string;
}

/**
 * Threshold Checker Interface
 *
 * Implement this interface to create new threshold types.
 * Each threshold independently evaluates whether a snapshot should be created.
 */
export interface ThresholdChecker {
  /**
   * Unique identifier for this threshold
   */
  readonly name: string;

  /**
   * Evaluate if this threshold has been met
   * @returns true if snapshot should be created
   */
  evaluate(context: ThresholdContext): Promise<boolean>;

  /**
   * Get configuration for this threshold
   */
  getConfig(): ThresholdConfig;
}

/**
 * Threshold Registry
 *
 * Manages all registered thresholds and evaluates them.
 * New thresholds can be added without modifying core worker code.
 */
export class ThresholdRegistry {
  private checkers: Map<string, ThresholdChecker> = new Map();

  /**
   * Register a new threshold checker
   */
  register(checker: ThresholdChecker): void {
    this.checkers.set(checker.name, checker);
    logger.info("✅ Registered threshold", {
      name: checker.name,
      config: checker.getConfig(),
    });
  }

  /**
   * Evaluate all enabled thresholds
   * @returns true if ANY threshold is met
   */
  async shouldCreateSnapshot(context: ThresholdContext): Promise<boolean> {
    const results = await Promise.all(
      Array.from(this.checkers.values())
        .filter((checker) => checker.getConfig().enabled)
        .map(async (checker) => ({
          name: checker.name,
          triggered: await checker.evaluate(context),
        }))
    );

    const triggered = results.filter((r) => r.triggered);

    if (triggered.length > 0) {
      logger.info("🎯 Thresholds triggered", {
        triggered: triggered.map((t) => t.name),
      });
      return true;
    }

    return false;
  }

  /**
   * Get names of all triggered thresholds (for debugging)
   */
  async getTriggeredThresholds(context: ThresholdContext): Promise<string[]> {
    const results = await Promise.all(
      Array.from(this.checkers.values())
        .filter((checker) => checker.getConfig().enabled)
        .map(async (checker) => ({
          name: checker.name,
          triggered: await checker.evaluate(context),
        }))
    );

    return results.filter((r) => r.triggered).map((r) => r.name);
  }

  /**
   * Get a specific threshold by name
   */
  getThreshold(name: string): ThresholdChecker | undefined {
    return this.checkers.get(name);
  }

  /**
   * Get all registered thresholds
   */
  getRegisteredThresholds(): ThresholdChecker[] {
    return Array.from(this.checkers.values());
  }
}
