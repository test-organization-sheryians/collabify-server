/**
 * feature-flag-engine.ts
 *
 * Stage 5 — Feature Flag Engine.
 *
 * Resolves feature flags for a given context (user / project / workspace / global).
 * Resolution order: USER > PROJECT > WORKSPACE > GLOBAL (defaultEnabled)
 *
 * Redis cache strategy:
 *   Key: `flag:{key}:{contextType}:{contextId}` → "1" | "0"
 *   TTL: 5 minutes (FEATURE_FLAG_TTL_S)
 *   Invalidation: FeatureFlagInvalidator.invalidate(key, contextType, contextId)
 *
 * Usage:
 *   const flags = new FeatureFlagEngine(userId, workspaceId, projectId, db, redis);
 *   const enabled = await flags.isEnabled("ai.summary");
 */
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("authorization:feature-flag-engine");

/** 5 minute cache TTL for all feature flag results */
const FEATURE_FLAG_TTL_S = 300;

/** FlagKey type — string for Phase D. Will be narrowed to a union in Phase E. */
export type FlagKey = string;

interface FlagContext {
  userId?: string;
  workspaceId?: string;
  projectId?: string;
}

function cacheKey(flagKey: string, contextType: string, contextId: string): string {
  return `flag:${flagKey}:${contextType}:${contextId}`;
}

export class FeatureFlagEngine {
  constructor(
    private readonly context: FlagContext,
    private readonly db: PrismaClient,
    private readonly redis: Redis
  ) {}

  /**
   * isEnabled — resolves a single flag.
   * Returns false gracefully if the flag doesn't exist.
   */
  async isEnabled(key: FlagKey): Promise<boolean> {
    try {
      return await this.resolve(key);
    } catch (err) {
      logger.error("FeatureFlagEngine.isEnabled failed — defaulting to false", { key, err });
      return false;
    }
  }

  /**
   * getAll — resolves multiple flags in parallel.
   * Returns a Record<key, boolean>.
   */
  async getAll(keys: FlagKey[]): Promise<Record<string, boolean>> {
    const entries = await Promise.all(
      keys.map(async (k) => [k, await this.isEnabled(k)] as const)
    );
    return Object.fromEntries(entries);
  }

  // ── Private resolution pipeline ───────────────────────────────────────────

  private async resolve(key: FlagKey): Promise<boolean> {
    const { userId, projectId, workspaceId } = this.context;

    // Resolution order: USER > PROJECT > WORKSPACE > GLOBAL (defaultEnabled)
    const lookups: Array<{ contextType: string; contextId: string | undefined }> = [
      { contextType: "USER",      contextId: userId },
      { contextType: "PROJECT",   contextId: projectId },
      { contextType: "WORKSPACE", contextId: workspaceId },
      { contextType: "GLOBAL",    contextId: "GLOBAL" }, // sentinel for global override
    ];

    for (const { contextType, contextId } of lookups) {
      if (!contextId) continue;

      const cached = await this.getCached(key, contextType, contextId);
      if (cached !== null) return cached;

      const override = await this.loadOverride(key, contextType, contextId);
      if (override !== null) {
        await this.setCached(key, contextType, contextId, override);
        return override;
      }
    }

    // Fallback: load flag default
    return this.loadDefault(key);
  }

  private async getCached(
    key: string,
    contextType: string,
    contextId: string
  ): Promise<boolean | null> {
    const val = await this.redis.get(cacheKey(key, contextType, contextId));
    if (val === null) return null;
    return val === "1";
  }

  private async setCached(
    key: string,
    contextType: string,
    contextId: string,
    enabled: boolean
  ): Promise<void> {
    await this.redis.setex(
      cacheKey(key, contextType, contextId),
      FEATURE_FLAG_TTL_S,
      enabled ? "1" : "0"
    );
  }

  private async loadOverride(
    key: string,
    contextType: string,
    contextId: string
  ): Promise<boolean | null> {
    // For GLOBAL context, match rows where contextId IS NULL
    const isGlobal = contextType === "GLOBAL";

    const override = await this.db.featureFlagOverride.findFirst({
      where: {
        flag: { key },
        contextType: contextType as any,
        contextId: isGlobal ? null : contextId,
      },
      select: { enabled: true },
    });

    return override?.enabled ?? null;
  }

  private async loadDefault(key: string): Promise<boolean> {
    const flag = await this.db.featureFlag.findUnique({
      where: { key },
      select: { defaultEnabled: true },
    });
    // Graceful fallback: unknown flags are always disabled
    return flag?.defaultEnabled ?? false;
  }
}
