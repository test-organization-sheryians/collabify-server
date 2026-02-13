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
export const ALL = false;

// ═══════════════════════════════════════════════════════════════
// GROUP FLAGS (enable entire feature/module)
// ═══════════════════════════════════════════════════════════════
export const GROUPS = {
  // ═══════════════════════════════════════════════════════════════
  // Module Groups (enable entire feature)
  // ═══════════════════════════════════════════════════════════════
  chat: false, // All chat module logs (jobs, WS, services)
  whiteboard: false, // All whiteboard module logs (WS, jobs, services)
  notification: false, // All notification engine + channel logs
  user: false, // All user module logs
  workspace: false, // All workspace module logs
  project: false, // All project module logs

  // ═══════════════════════════════════════════════════════════════
  // Infrastructure Groups
  // ═══════════════════════════════════════════════════════════════
  infra: false, // All infrastructure (db, redis, s3, ses, ws)
  ws: false, // All WebSocket infrastructure (gateway, router, worker, registry)
  db: false, // Database infrastructure
  api: false, // API layer
  services: false, // Core services (bullmq, clerk, providers)

  // ═══════════════════════════════════════════════════════════════
  // Whiteboard Flow Groups (🎯 For Easy Debugging)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Stream Worker Complete Flow
   * Enables: worker init, loops, processor, cache, snapshot, board-init, health
   * Use when: Debugging stream consumption, snapshot creation, cache updates
   */
  "whiteboard-stream-worker": true,

  /**
   * Board Update E2E Flow (Frontend → Backend → Stream)
   * Enables: board-update WS handler + stream processor + cache
   * Use when: Tracing board updates from client to Redis stream
   */
  "whiteboard-board-update-flow": false,

  /**
   * Snapshot Flow (Triggers → S3 → Trim)
   * Enables: snapshot manager, S3 client, stream worker
   * Use when: Debugging snapshot creation, S3 uploads, stream trimming
   */
  "whiteboard-snapshot-flow": false,

  /**
   * Whiteboard WebSocket Flow
   * Enables: All WS handlers (subscribe, board-update, cursor, selection)
   * Use when: Debugging real-time collaboration events
   */
  "whiteboard-ws": false,

  /**
   * Cold Start & Initialization
   * Enables: board-init, S3 client, stream processor
   * Use when: Debugging board loading from S3 + stream replay
   */
  "whiteboard-cold-start": false,

  // ═══════════════════════════════════════════════════════════════
  // Chat Flow Groups
  // ═══════════════════════════════════════════════════════════════

  /**
   * Message Persistence Flow
   * Enables: send-message WS + persist jobs + outbox cleanup
   * Use when: Debugging message delivery and persistence
   */
  "chat-message-flow": false,

  /**
   * Reactions Flow
   * Enables: add/remove reaction WS + persist/reconcile jobs + domain helpers
   * Use when: Debugging reactions system
   */
  "chat-reactions": false,

  // ═══════════════════════════════════════════════════════════════
  // Development & Testing
  // ═══════════════════════════════════════════════════════════════
  stream: false, // All stream-related logs (Redis streams)
  auth: false, // Authentication & authorization
  shared: false, // Shared utilities
  modules: false, // All modules (chat, whiteboard, notification, etc.)
} as const;

// ═══════════════════════════════════════════════════════════════
// FILE FLAGS (granular per-file control)
// ═══════════════════════════════════════════════════════════════
export const FILES: Record<string, boolean | undefined> = {
  // ─────────────────────────────────────
  // Core Infrastructure
  // ─────────────────────────────────────
  "db:setup": undefined, // infra/db/setup.ts
  "ws:connection": undefined, // infra/ws/connection.ts
  "ws:events": undefined, // infra/ws/events.ts
  "api:handler": undefined, // app/api/handler.ts
  "app:server": undefined, // app/server.ts
  "app:webhooks": undefined, // app/webhooks/
  "app:middlewares": undefined, // app/middlewares/
  "app:graphql": undefined, // app/graphql/
  "infra:db": undefined, // infra/db/
  "infra:redis": undefined, // infra/redis/
  "infra:email": undefined, // infra/email/
  "infra:streams": undefined, // infra/streams/
  "infra:s3": undefined, // infra/aws/s3.ts
  "infra:ses": undefined, // infra/aws/ses.ts
  "infra:ws:gateway": undefined, // infra/ws/gateway.ts
  "infra:ws:router": undefined, // infra/ws/router.ts
  "infra:ws:worker": undefined, // infra/ws/worker.ts
  "infra:ws:registry": undefined, // infra/ws/registry.ts
  // ─────────────────────────────────────
  // Chat Module
  // ─────────────────────────────────────
  "chat:engine": undefined, // modules/chat/index.ts
  "chat:jobs:index": undefined, // modules/chat/jobs/index.ts
  "chat:jobs:persist-message": undefined, // modules/chat/jobs/persist-message.ts
  "chat:jobs:persist-message-edit": undefined, // modules/chat/jobs/persist-message-edit.ts
  "chat:jobs:persist-message-delete": undefined, // modules/chat/jobs/persist-message-delete.ts
  "chat:jobs:cleanup-outbox": undefined, // modules/chat/jobs/cleanup-outbox.ts
  "chat:jobs:recover-stuck-outbox": undefined, // modules/chat/jobs/recover-stuck-outbox.ts
  "chat:jobs:persist-reactions": undefined, // modules/chat/jobs/persist-reactions.ts
  "chat:jobs:reconcile-reactions": undefined, // modules/chat/jobs/reconcile-reactions.ts
  "chat:jobs:batch-read-receipts": undefined, // modules/chat/jobs/batch-read-receipts.ts
  "chat:jobs:reaction-jobs": undefined, // modules/chat/jobs/reaction-jobs.ts
  "chat:ws:router": undefined, // modules/chat/ws/router.ts
  "chat:ws:send-message": undefined, // modules/chat/ws/send-message-handler.ts
  "chat:ws:edit-message": undefined, // modules/chat/ws/edit-message-handler.ts
  "chat:ws:delete-message": undefined, // modules/chat/ws/delete-message-handler.ts
  "chat:ws:subscribe": undefined, // modules/chat/ws/subscribe-handler.ts
  "chat:ws:unsubscribe": undefined, // modules/chat/ws/unsubscribe-handler.ts
  "chat:ws:add-reaction": undefined, // modules/chat/ws/add-reaction-handler.ts
  "chat:ws:remove-reaction": undefined, // modules/chat/ws/remove-reaction-handler.ts
  "chat:ws:mark-read": undefined, // modules/chat/ws/mark-read-handler.ts
  "chat:ws:typing-start": undefined, // modules/chat/ws/typing-start-handler.ts
  "chat:ws:typing-stop": undefined, // modules/chat/ws/typing-stop-handler.ts
  "chat:ws:user-typing": undefined, // modules/chat/ws/user-typing-handler.ts
  "chat:ws:user-stop-typing": undefined, // modules/chat/ws/user-stop-typing-handler.ts
  "chat:services:create-channel": undefined, // modules/chat/services/create-channel/
  "chat:queries:get-reactions": undefined, // modules/chat/queries/get-reactions/
  "chat:domain:reactions:batch": undefined, // modules/chat/domain/reactions/batch.ts
  "chat:domain:reactions:helpers": undefined, // modules/chat/domain/reactions/helpers.ts
  "chat:domain:reactions:metrics": undefined, // modules/chat/domain/reactions/metrics.ts
  // ─────────────────────────────────────
  // Whiteboard Module
  // ─────────────────────────────────────
  "whiteboard:engine": true, // modules/whiteboard/index.ts
  "whiteboard:ws:subscribe": undefined, // modules/whiteboard/ws/subscribe-handler.ts
  "whiteboard:ws:unsubscribe": undefined, // modules/whiteboard/ws/unsubscribe-handler.ts
  "whiteboard:ws:board-update": undefined, // modules/whiteboard/ws/board-update-handler.ts
  "whiteboard:ws:cursor": undefined, // modules/whiteboard/ws/cursor-handler.ts
  "whiteboard:ws:selection": undefined, // modules/whiteboard/ws/selection-handler.ts
  "whiteboard:infra:stream-worker": true, // modules/whiteboard/infra/stream-worker/
  "whiteboard:stream-worker:board-init": true, // modules/whiteboard/infra/stream-worker/board-initializer.ts
  "whiteboard:stream-worker:snapshot": true, // modules/whiteboard/infra/stream-worker/snapshot-manager.ts
  "whiteboard:stream-worker:cache": true, // modules/whiteboard/infra/stream-worker/cache-manager.ts
  "whiteboard:stream-worker:processor": true, // modules/whiteboard/infra/stream-worker/stream-processor.ts
  "whiteboard:stream-worker:loops": true, // modules/whiteboard/infra/stream-worker/worker-loops.ts
  "whiteboard:stream-worker:health": undefined, // modules/whiteboard/infra/stream-worker/health-monitor.ts
  "whiteboard:infra:s3": undefined, // modules/whiteboard/infra/s3-client-wrapper.ts
  "whiteboard:infra:loop-prevention": undefined, // modules/whiteboard/infra/loop-prevention.ts
  "whiteboard:jobs:snapshot": undefined, // modules/whiteboard/jobs/snapshot.ts
  "whiteboard:jobs:cleanup": undefined, // modules/whiteboard/jobs/cleanup.ts
  "whiteboard:services:create-board": undefined, // modules/whiteboard/services/create-board/
  "whiteboard:queries:get-snapshot": undefined, // modules/whiteboard/queries/get-board-snapshot/
  // ─────────────────────────────────────
  // Internal Module
  // ─────────────────────────────────────
  "internal:assign-workspace": undefined, // modules/internal/assign-workspace.ts
  "internal:metrics": undefined, // modules/internal/metrics.ts
  // ─────────────────────────────────────
  // Notification Module
  // ─────────────────────────────────────
  "notification:engine:bootstrap": undefined, // modules/notification/engine/bootstrap.ts
  "notification:engine:poller": undefined, // modules/notification/engine/poller.ts
  "notification:engine:fan-out": undefined, // modules/notification/engine/fan-out.ts
  "notification:engine:decider": undefined, // modules/notification/engine/decider.ts
  "notification:engine:batch": undefined, // modules/notification/engine/batch.ts
  "notification:engine:recovery": undefined, // modules/notification/engine/recovery.ts
  "notification:engine:cleanup": undefined, // modules/notification/engine/cleanup.ts
  "notification:channel:email": undefined, // modules/notification/channel/email.ts
  "notification:channel:push": undefined, // modules/notification/channel/push.ts
  "notification:channel:in-app": undefined, // modules/notification/channel/in-app.ts
  "notification:channel:realtime": undefined, // modules/notification/channel/realtime.ts
  "notification:lib": undefined, // modules/notification/lib/outbox.writer.ts
  "notification:services:read": undefined, // modules/notification/services/read/
  // ─────────────────────────────────────
  // User Module
  // ─────────────────────────────────────
  "user:services:sync": undefined, // modules/user/services/sync/
  "user:queries:me": undefined, // modules/user/queries/me/
  // ─────────────────────────────────────
  // Workspace Module
  // ─────────────────────────────────────
  "workspace:services:create": undefined, // modules/workspace/services/create/
  "workspace:services:onboarding": undefined, // modules/workspace/services/onboarding/
  "workspace:services:invite": undefined, // modules/workspace/services/invite/
  "workspace:services:slug": undefined, // modules/workspace/services/slug/
  "workspace:services:member": undefined, // modules/workspace/services/member/
  // ─────────────────────────────────────
  // Project Module
  // ─────────────────────────────────────
  "project:services:create": undefined, // modules/project/services/create/
  "project:queries:get": undefined, // modules/project/queries/get/
  // ─────────────────────────────────────
  // Quota Module
  // ─────────────────────────────────────
  "quota:enforce": undefined, // modules/quota/enforce.ts
  // ─────────────────────────────────────
  // Infrastructure & Services (Core)
  // ─────────────────────────────────────
  "services:bullmq": undefined, // services/bullmq/
  "services:clerk": undefined, // services/clerk/
  "services:providers": undefined, // services/providers/
};

export type GroupFlag = keyof typeof GROUPS;
export type FileFlag = keyof typeof FILES;
