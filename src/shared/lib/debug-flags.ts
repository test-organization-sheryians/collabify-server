/**
 * HIERARCHICAL DEBUG FLAGS (Backend)
 *
 * Resolution Priority: FILE > GROUP > ALL
 * - Set to `true` to enable logging
 * - Set to `undefined` to inherit from parent
 */

// ═══════════════════════════════════════════════════════════════
// MASTER SWITCH
// ═══════════════════════════════════════════════════════════════
export const ALL = false; // ❌ DISABLED - Using targeted flags only

// ═══════════════════════════════════════════════════════════════
// GROUP FLAGS (enable entire feature/module)
// ═══════════════════════════════════════════════════════════════
export const GROUPS = {
  // ═══════════════════════════════════════════════════════════════
  // Module Groups (enable entire feature)
  // ═══════════════════════════════════════════════════════════════
  chat: false, // ❌ All chat module logs (jobs, WS, services)
  whiteboard: false, // ❌ All whiteboard module logs (WS, jobs, services)
  notification: false, // ❌ All notification engine + channel logs
  user: false, // ❌ All user module logs
  workspace: false, // ❌ All workspace module logs
  project: false, // ❌ All project module logs

  // ═══════════════════════════════════════════════════════════════
  // Infrastructure Groups
  // ═══════════════════════════════════════════════════════════════
  infra: false, // ❌ All infrastructure (db, redis, s3, ses, ws)
  ws: false, // ❌ All WebSocket infrastructure (gateway, router, worker, registry)
  db: false, // ❌ Database infrastructure
  api: false, // ❌ API layer
  services: false, // ❌ Core services (bullmq, clerk, providers)

  // ═══════════════════════════════════════════════════════════════
  // Whiteboard Flow Groups (🎯 For Easy Debugging)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Stream Worker Complete Flow
   * Enables: worker init, loops, processor, cache, snapshot, board-init, health
   * Use when: Debugging stream consumption, snapshot creation, cache updates
   */
  "whiteboard-stream-worker": true, // ✅ ENABLED for testing

  /**
   * Board Update E2E Flow (Frontend → Backend → Stream)
   * Enables: board-update WS handler + stream processor + cache
   * Use when: Tracing board updates from client to Redis stream
   */
  "whiteboard-board-update-flow": false, // ❌

  /**
   * Snapshot Flow (Triggers → S3 → Trim)
   * Enables: snapshot manager, S3 client, stream worker
   * Use when: Debugging snapshot creation, S3 uploads, stream trimming
   */
  "whiteboard-snapshot-flow": false, // ❌

  /**
   * Whiteboard WebSocket Flow
   * Enables: All WS handlers (subscribe, board-update, cursor, selection)
   * Use when: Debugging real-time collaboration events
   */
  "whiteboard-ws": false, // ❌

  /**
   * Cold Start & Initialization
   * Enables: board-init, S3 client, stream processor
   * Use when: Debugging board loading from S3 + stream replay
   */
  "whiteboard-cold-start": false, // ❌

  // ═══════════════════════════════════════════════════════════════
  // Chat Flow Groups
  // ═══════════════════════════════════════════════════════════════

  /**
   * Message Persistence Flow
   * Enables: send-message WS + persist jobs + outbox cleanup
   * Use when: Debugging message delivery and persistence
   */
  "chat-message-flow": false, // ❌

  /**
   * Reactions Flow
   * Enables: add/remove reaction WS + persist/reconcile jobs + domain helpers
   * Use when: Debugging reactions system
   */
  "chat-reactions": false, // ❌

  // ═══════════════════════════════════════════════════════════════
  // Development & Testing
  // ═══════════════════════════════════════════════════════════════
  stream: false, // ❌ All stream-related logs (Redis streams)
  auth: false, // ❌ Authentication & authorization
  shared: false, // ❌ Shared utilities
  modules: false, // ❌ All modules (chat, whiteboard, notification, etc.)
} as const;

// ═══════════════════════════════════════════════════════════════
// FILE FLAGS (granular per-file control)
// ═══════════════════════════════════════════════════════════════
export const FILES: Record<string, boolean | undefined> = {
  // ─────────────────────────────────────
  // Core Infrastructure
  // ─────────────────────────────────────
  "db:setup": false, // infra/db/setup.ts
  "ws:connection": false, // infra/ws/connection.ts
  "ws:events": false, // infra/ws/events.ts
  "api:handler": false, // app/api/handler.ts
  "app:server": false, // app/server.ts
  "app:webhooks": false, // app/webhooks/
  "app:middlewares": false, // app/middlewares/
  "app:graphql": false, // app/graphql/
  "infra:db": false, // infra/db/
  "infra:redis": false, // infra/redis/
  "infra:email": false, // infra/email/
  "infra:streams": false, // infra/streams/
  "infra:s3": false, // infra/aws/s3.ts
  "infra:ses": false, // infra/aws/ses.ts
  "infra:ws:gateway": false, // infra/ws/gateway.ts
  "infra:ws:router": false, // infra/ws/router.ts
  "infra:ws:worker": false, // infra/ws/worker.ts
  "infra:ws:registry": false, // infra/ws/registry.ts

  // ─────────────────────────────────────
  // Chat Module
  // ─────────────────────────────────────
  "chat:engine": false, // modules/chat/index.ts
  "chat:jobs:index": false, // modules/chat/jobs/index.ts
  "chat:jobs:persist-message": false, // modules/chat/jobs/persist-message.ts
  "chat:jobs:persist-message-edit": false, // modules/chat/jobs/persist-message-edit.ts
  "chat:jobs:persist-message-delete": false, // modules/chat/jobs/persist-message-delete.ts
  "chat:jobs:cleanup-outbox": false, // modules/chat/jobs/cleanup-outbox.ts
  "chat:jobs:recover-stuck-outbox": false, // modules/chat/jobs/recover-stuck-outbox.ts
  "chat:jobs:persist-reactions": false, // modules/chat/jobs/persist-reactions.ts
  "chat:jobs:reconcile-reactions": false, // modules/chat/jobs/reconcile-reactions.ts
  "chat:jobs:batch-read-receipts": false, // modules/chat/jobs/batch-read-receipts.ts
  "chat:jobs:reaction-jobs": false, // modules/chat/jobs/reaction-jobs.ts
  "chat:ws:router": false, // modules/chat/ws/router.ts
  "chat:ws:send-message": false, // modules/chat/ws/send-message-handler.ts
  "chat:ws:edit-message": false, // modules/chat/ws/edit-message-handler.ts
  "chat:ws:delete-message": false, // modules/chat/ws/delete-message-handler.ts
  "chat:ws:subscribe": false, // modules/chat/ws/subscribe-handler.ts
  "chat:ws:unsubscribe": false, // modules/chat/ws/unsubscribe-handler.ts
  "chat:ws:add-reaction": false, // modules/chat/ws/add-reaction-handler.ts
  "chat:ws:remove-reaction": false, // modules/chat/ws/remove-reaction-handler.ts
  "chat:ws:mark-read": false, // modules/chat/ws/mark-read-handler.ts
  "chat:ws:typing-start": false, // modules/chat/ws/typing-start-handler.ts
  "chat:ws:typing-stop": false, // modules/chat/ws/typing-stop-handler.ts
  "chat:ws:user-typing": false, // modules/chat/ws/user-typing-handler.ts
  "chat:ws:user-stop-typing": false, // modules/chat/ws/user-stop-typing-handler.ts
  "chat:services:create-channel": false, // modules/chat/services/create-channel/
  "chat:queries:get-reactions": false, // modules/chat/queries/get-reactions/
  "chat:domain:reactions:batch": false, // modules/chat/domain/reactions/batch.ts
  "chat:domain:reactions:helpers": false, // modules/chat/domain/reactions/helpers.ts
  "chat:domain:reactions:metrics": false, // modules/chat/domain/reactions/metrics.ts

  // ─────────────────────────────────────
  // Whiteboard Module (✅ STREAM WORKER V2 ONLY)
  // ─────────────────────────────────────
  "whiteboard:engine": false, // modules/whiteboard/index.ts - Worker startup
  "whiteboard:ws:subscribe": true, // modules/whiteboard/ws/subscribe-handler.ts
  "whiteboard:ws:unsubscribe": true, // modules/whiteboard/ws/unsubscribe-handler.ts
  "whiteboard:ws:board-update": true, // modules/whiteboard/ws/board-update-handler.ts - Update handling ✅
  "whiteboard:ws:cursor": false, // modules/whiteboard/ws/cursor-handler.ts
  "whiteboard:ws:selection": false, // modules/whiteboard/ws/selection-handler.ts

  // Stream Worker V2 - Exact Logger Names (from createLogger calls)
  "whiteboard:stream-worker-v2": true, // worker.ts actual logger ✅
  "whiteboard:stream-worker-v2:loops": true, // worker-loops.ts actual logger ✅
  "whiteboard:stream-worker-v2:processor": true, // processor.ts actual logger ✅
  "whiteboard:stream-worker-v2:s3-sync": true, // s3-sync.ts actual logger ✅

  "whiteboard:stream-worker:lua": true, // lua-scripts.ts actual logger ✅
  "whiteboard:threshold:registry": true, // thresholds/index.ts actual logger ✅
  "whiteboard:threshold:stream-length": true, // thresholds/stream-length.ts actual logger ✅
  "whiteboard:infra:s3": true, // modules/whiteboard/infra/s3-client.ts - S3 operations ✅
  "whiteboard:infra:loop-prevention": false, // modules/whiteboard/infra/loop-prevention.ts
  "whiteboard:jobs:snapshot": false, // modules/whiteboard/jobs/snapshot.ts
  "whiteboard:jobs:cleanup": false, // modules/whiteboard/jobs/cleanup.ts
  "whiteboard:services:create-board": false, // modules/whiteboard/services/create-board/
  "whiteboard:services:delete-board": true, // ✅ modules/whiteboard/services/delete-board/handler.ts
  "whiteboard:services:delete-board:cleanup": true, // ✅ modules/whiteboard/services/delete-board/cleanup.ts
  "whiteboard:queries:get-snapshot": false, // modules/whiteboard/queries/get-board-snapshot/ - Query handler

  // ─────────────────────────────────────
  // Internal Module
  // ─────────────────────────────────────
  "internal:assign-workspace": false, // modules/internal/assign-workspace.ts
  "internal:metrics": false, // modules/internal/metrics.ts

  // ─────────────────────────────────────
  // Notification Module
  // ─────────────────────────────────────
  "notification:engine:bootstrap": false, // modules/notification/engine/bootstrap.ts
  "notification:engine:poller": false, // modules/notification/engine/poller.ts
  "notification:engine:fan-out": false, // modules/notification/engine/fan-out.ts
  "notification:engine:decider": false, // modules/notification/engine/decider.ts
  "notification:engine:batch": false, // modules/notification/engine/batch.ts
  "notification:engine:recovery": false, // modules/notification/engine/recovery.ts
  "notification:engine:cleanup": false, // modules/notification/engine/cleanup.ts
  "notification:channel:email": false, // modules/notification/channel/email.ts
  "notification:channel:push": false, // modules/notification/channel/push.ts
  "notification:channel:in-app": false, // modules/notification/channel/in-app.ts
  "notification:channel:realtime": false, // modules/notification/channel/realtime.ts
  "notification:lib": false, // modules/notification/lib/outbox.writer.ts
  "notification:services:read": false, // modules/notification/services/read/

  // ─────────────────────────────────────
  // User Module
  // ─────────────────────────────────────
  "user:services:sync": false, // modules/user/services/sync/
  "user:queries:me": false, // modules/user/queries/me/

  // ─────────────────────────────────────
  // Workspace Module
  // ─────────────────────────────────────
  "workspace:services:create": false, // modules/workspace/services/create/
  "workspace:services:onboarding": false, // modules/workspace/services/onboarding/
  "workspace:services:invite": false, // modules/workspace/services/invite/
  "workspace:services:slug": false, // modules/workspace/services/slug/
  "workspace:services:member": false, // modules/workspace/services/member/

  // ─────────────────────────────────────
  // Project Module
  // ─────────────────────────────────────
  "project:services:create": false, // modules/project/services/create/
  "project:queries:get": false, // modules/project/queries/get/

  // ─────────────────────────────────────
  // Quota Module
  // ─────────────────────────────────────
  "quota:enforce": false, // modules/quota/enforce.ts

  // ─────────────────────────────────────
  // Infrastructure & Services (Core)
  // ─────────────────────────────────────
  "services:bullmq": false, // services/bullmq/
  "services:clerk": false, // services/clerk/
  "services:providers": false, // services/providers/
};

export type GroupFlag = keyof typeof GROUPS;
export type FileFlag = keyof typeof FILES;
