/**
 * PagesModule — top-level public API for the Pages backend module.
 *
 * ─── Phase 7 Wire-Up Checklist ────────────────────────────────────────────────
 *
 * 7A — graphql/schema.ts:
 *   import { pageTypeDefs, pageResolvers } from '../../modules/pages'
 *   Add to mergeTypeDefs([...existing, ...pageTypeDefs])
 *   Add to mergeResolvers([...existing, pageResolvers])
 *
 * 7B — graphql/context.ts (createContext):
 *   import { createPageLoaders } from '../../modules/pages'
 *   Add: dataloaders.page: createPageLoaders()
 *   (graphql/types.ts already has `page: PageLoaders` in ApplicationContext)
 *
 * 7C — infra/ws/ws-routes.ts (or wherever RouteMap is merged):
 *   import { pageWSRoutes } from '../../modules/pages'
 *   Merge: { ...existingRoutes, ...pageWSRoutes }
 *
 * 7D — server/index.ts or app.ts (startup):
 *   import { PagesModule } from '../../modules/pages'
 *   await PagesModule.startEngine(redis)  // pre-loads Lua scripts
 *   // Must complete before WS server accepts connections
 *
 * 7E — Stream worker process (separate pod):
 *   import { startWorker } from '../../modules/pages/stream-worker'
 *   await startWorker(redis)
 */

import { loadAllLuaScripts, type LuaShas } from "./infra/lua";
import type { Redis } from "ioredis";

// ── Public Re-exports ──────────────────────────────────────────────────────────

/** GraphQL type definitions (all services + queries + shared types) */
export { typeDefs as pageTypeDefs } from "./graphql/type-defs";

/** GraphQL resolvers (all query + mutation + field resolvers) */
export { resolvers as pageResolvers } from "./graphql/resolvers";

/** DataLoader factory — call once per GraphQL request in createContext() */
export { createPageLoaders } from "./loaders";
export type { PageLoaders } from "./loaders";

/** WS RouteMap — merge into global RouteMap in ws-routes.ts */
export { pageWSRoutes } from "./ws/router";

// ── Module Singleton ───────────────────────────────────────────────────────────

let _luaShas: LuaShas | null = null;

/**
 * PagesModule.startEngine() — pre-loads all Lua scripts and returns their SHAs.
 *
 * MUST be called before the WS server starts accepting connections.
 * Subsequent calls return the already-loaded SHAs (idempotent after first call).
 */
export const PagesModule = {
  async startEngine(redis: Redis): Promise<LuaShas> {
    if (_luaShas) return _luaShas;
    _luaShas = await loadAllLuaScripts(redis);
    return _luaShas;
  },

  /** Returns cached Lua SHAs. Throws if startEngine has not been called. */
  getLuaShas(): LuaShas {
    if (!_luaShas)
      throw new Error(
        "PagesModule.startEngine() must be called before accessing Lua SHAs"
      );
    return _luaShas;
  },
};
