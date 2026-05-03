/**
 * HIERARCHICAL DEBUG FLAGS (Backend)
 *
 * Resolution Priority: FILE > FLOW_GROUP > GROUP > ALL
 * - true      → always enabled
 * - false     → always disabled
 * - undefined → inherit from parent group / ALL
 *
 * All flags default to false (off). Flip individual flags or groups
 * to turn on targeted logging without noise.
 */

// ═══════════════════════════════════════════════════════════════
// MASTER SWITCH — set true to enable every logger at once
// ═══════════════════════════════════════════════════════════════
export const ALL = true;

// ═══════════════════════════════════════════════════════════════
// GROUP FLAGS — enable an entire feature or module at once
// ═══════════════════════════════════════════════════════════════
export const GROUPS = {
  // ─── Module groups ──────────────────────────────────────────
  chat: false,           // all chat module logs
  whiteboard: false,     // all whiteboard module logs
  notification: true,    // all notification module logs
  user: false,           // all user module logs
  workspace: false,      // all workspace module logs
  project: false,        // all project module logs
  vault: false,          // all vault module logs
  pages: false,          // all pages module logs
  issues: false,         // all issues module logs
  internal: false,       // all internal module logs
  middleware: false,     // all middleware logs

  // ─── Infrastructure groups ───────────────────────────────────
  infra: false,          // all infrastructure (db, redis, s3, ses, ws)
  ws: false,             // all WebSocket infra (gateway, router, worker, registry)
  db: false,             // database infrastructure
  api: false,            // API layer (graphql, middlewares, webhooks, server)
  services: false,       // core services (bullmq, clerk, email-provider)

  // ─── Whiteboard composite flows ─────────────────────────────

  /**
   * Stream Worker end-to-end
   * Enables: worker init, loops, processor, cache, snapshot, health
   */
  "whiteboard-stream-worker": false,

  /**
   * Board Update E2E (WebSocket → stream → cache)
   * Enables: board-update WS handler + stream processor
   */
  "whiteboard-board-update-flow": false,

  /**
   * Snapshot pipeline (triggers → S3 → trim)
   * Enables: snapshot manager, S3 client, stream worker
   */
  "whiteboard-snapshot-flow": false,

  /**
   * WebSocket real-time collaboration events
   * Enables: subscribe, board-update, cursor, selection handlers
   */
  "whiteboard-ws": false,

  /**
   * Cold start / board init from S3 + stream replay
   * Enables: board-init, S3 client, stream processor
   */
  "whiteboard-cold-start": false,

  // ─── Chat composite flows ────────────────────────────────────

  /**
   * Message send → persist → outbox cleanup pipeline
   */
  "chat-message-flow": false,

  /**
   * Reactions add/remove → persist → reconcile pipeline
   */
  "chat-reactions": false,

  // ─── Vault composite flows ───────────────────────────────────

  /**
   * Full upload pipeline: request-upload → S3 → confirm-upload
   */
  "vault-upload-flow": false,

  /**
   * Media delete lifecycle: mark-unreferenced → cleanup job → S3 delete
   * Enables: mark-unreferenced service, unreferenced-cleanup job, is-file-referenced lib
   * Toggle this to trace the full delete → unref → S3 removal pipeline.
   */
  "vault-media-lifecycle": false, // ✅ Enable for lifecycle testing — set false in prod

  // ─── Notification composite flows ───────────────────────────

  /**
   * Outbox ingestion: writer → poller → decider queue handoff
   * Enables: outbox-writer, outbox-poller, notification:debug
   */
  "notification-outbox-flow": true,

  /**
   * Delivery decision pipeline: decider worker → preference resolver → dispatch
   * Enables: decider, fanout, batch-engine, preference-resolver, presence, rate-limit
   */
  "notification-delivery-flow": true,

  /**
   * Channel workers: in-app (store + cache) + realtime publisher + email + push
   * Enables: all 4 channel workers and their dependencies
   */
  "notification-channel-flow": true,

  /**
   * Shared infrastructure: preferences, dedup, idempotency, permission, fanout cursor
   * Enables: all notification:shared:* loggers
   */
  "notification-shared-flow": true,

  // ─── Development/Testing ─────────────────────────────────────
  stream: false,         // all Redis stream logs
  auth: false,           // authentication & authorization
  shared: false,         // shared utilities
  modules: false,        // all modules (catch-all)
} as const;

// ═══════════════════════════════════════════════════════════════
// FILE FLAGS — granular per-file control (highest priority)
// ═══════════════════════════════════════════════════════════════
export const FILES: Record<string, boolean | undefined> = {
  // ─────────────────────────────────────────────────────────────
  // App / API
  // ─────────────────────────────────────────────────────────────
  "app:server": false,
  "app:graphql": false,
  "app:middlewares": false,
  "app:webhooks": false,

  // ─────────────────────────────────────────────────────────────
  // Auth
  // ─────────────────────────────────────────────────────────────
  "auth:workspace-member": false,
  "authorization:feature-flag-engine": false,
  "authorization:feature-flag-invalidator": false,
  "authorization:permission-invalidator": false,
  "bootstrap:authorization": false,
  "bootstrap:sync-permissions": false,
  "bootstrap:sync-system-roles": false,

  // ─────────────────────────────────────────────────────────────
  // Infrastructure
  // ─────────────────────────────────────────────────────────────
  "db:setup": false,
  "infra:db": false,
  "infra:redis": false,
  "infra:email": false,        // infra/sendgrid.ts (legacy)
  "infra:s3": false,
  "infra:ses": false,
  "infra:streams": false,
  "infra:ws:gateway": false,
  "infra:ws:router": false,
  "infra:ws:worker": false,
  "infra:ws:registry": false,

  // ─────────────────────────────────────────────────────────────
  // Core Services
  // ─────────────────────────────────────────────────────────────
  "services:bullmq": false,
  "services:clerk": false,
  "services:providers": false,              // legacy (ses/sendgrid adapters)
  "services:email-provider:console": true, // console.adapter.ts
  "services:email-provider:nodemailer": false, // nodemailer.adapter.ts
  "services:push-provider:fcm": false,

  // ─────────────────────────────────────────────────────────────
  // Middleware
  // ─────────────────────────────────────────────────────────────
  "middleware:rate-limit-guard": false,

  // ─────────────────────────────────────────────────────────────
  // Internal Module
  // ─────────────────────────────────────────────────────────────
  "internal:assign-workspace": false,
  "internal:metrics": false,
  "internal:metrics-collector": false, // extra from research

  // ─────────────────────────────────────────────────────────────
  // User Module
  // ─────────────────────────────────────────────────────────────
  "user:services:sync-user": false,
  "user:queries:me": false,

  // ─────────────────────────────────────────────────────────────
  // Workspace Module
  // ─────────────────────────────────────────────────────────────
  "workspace:services:create-workspace": false,
  "workspace:services:create-onboarding-workspace": false,
  "workspace:services:invite-to-workspace": false,
  "workspace:services:check-slug-availability": false,
  "workspace:services:rename-workspace-slug": false,
  "workspace:services:request-workspace-logo-upload": false,

  // ─────────────────────────────────────────────────────────────
  // Project Module
  // ─────────────────────────────────────────────────────────────
  "project:services:create-project": false,
  "project:services:seed-project-defaults": false,
  "project:services:request-project-logo-upload": false,
  "project:services:toggle-project-plugin": false,

  // ─────────────────────────────────────────────────────────────
  // Issues Module
  // ─────────────────────────────────────────────────────────────
  // Queries
  "issues:queries:get-issue": false,
  "issues:queries:get-project-issues": false,
  "issues:queries:get-issue-statuses": false,
  "issues:queries:get-issue-labels": false,
  "issues:queries:get-issue-description-url": false,
  // Services
  "issues:services:create-issue": false,
  "issues:services:delete-issue": false,
  "issues:services:update-issue": false,
  "issues:services:reorder-issue": false,
  "issues:services:create-issue-status": false,
  "issues:services:delete-issue-status": false,
  "issues:services:update-issue-status": false,
  "issues:services:move-issue-status": false,
  "issues:services:reorder-issue-status": false,
  "issues:services:create-issue-label": false,
  "issues:services:delete-issue-label": false,
  "issues:services:update-issue-label": false,
  "issues:services:request-description-upload": false,
  "issues:services:confirm-description-upload": false,

  // ─────────────────────────────────────────────────────────────
  // Notification Module
  // ─────────────────────────────────────────────────────────────
  // Master debug console — enables [NOTIF:EMIT/PICKUP/DECIDER/RECIPIENT/DISPATCH/CHANNEL/DROP] logs
  "notification:debug": true, // ✅ ON for testing — set false to silence pipeline tracing
  // Notification preference services
  "notification:services:update-preferences": false,
  "user:services:update-global-notif-prefs": false,
  "workspace:services:update-workspace-notif-prefs": false,
  "project:services:update-project-notif-prefs": false,
  "chat:services:set-conversation-notif-mode": false,
  // Shared infrastructure
  "notification:shared:preference-seeder": false,
  "notification:shared:preference-writer": false,
  "notification:shared:preference-resolver": false,
  "notification:shared:preference-cache": false,
  "notification:engine:bootstrap": false,
  "notification:engine:poller": false,
  "notification:engine:fanout": false, // fixed mismatch (was fan-out)
  "notification:engine:decider": false,
  "notification:engine:batch": false,
  "notification:engine:recovery": false,
  "notification:engine:cleanup": false,
  "notification:channel:email": false,
  "notification:channel:push": false,
  "notification:channel:inapp": false, // fixed mismatch (was in-app)
  "notification:channel:inapp:store": false,
  "notification:channel:inapp:count-cache": false,
  "notification:channel:realtime": false,
  "notification:channel:realtime:publisher": false,
  "notification:outbox:writer": false,
  "notification:lib": false,
  "notification:services:read": false,
  // Management
  "notification:management:queries:get-notifications": false,
  "notification:management:queries:get-preferences": false,
  "notification:management:queries:get-unread-count": false,
  "notification:management:services:mark-read": false,
  "notification:management:services:mark-all-read": false,
  "notification:management:services:mute-conversation": false,
  "notification:management:services:update-preferences": false,
  // Shared
  "notification:shared:presence": false,
  "notification:shared:rate-limit": false,
  "notification:shared:dedup": false,
  "notification:shared:idempotency": false,
  "notification:shared:permission": false,
  "notification:shared:fanout": false,
  "notification:shared:fanout-cursor": false,
  "notification:shared:batch-engine": false,
  "notification:shared:batch-store": false,

  // ─────────────────────────────────────────────────────────────
  // Chat Module
  // ─────────────────────────────────────────────────────────────
  "chat:engine": false,
  // WebSocket handlers
  "chat:ws:subscribe": false,
  "chat:ws:unsubscribe": false,
  "chat:ws:send-message": false,
  "chat:ws:edit-message": false,
  "chat:ws:delete-message": false,
  "chat:ws:add-reaction": false,
  "chat:ws:remove-reaction": false,
  "chat:ws:mark-read": false,
  "chat:ws:typing-start": false,
  "chat:ws:typing-stop": false,
  "chat:ws:user-typing": false,
  "chat:ws:user-stop-typing": false,
  // Jobs
  "chat:jobs:index": false,
  "chat:jobs:persist-message": false,
  "chat:jobs:persist-message-edit": false,
  "chat:jobs:persist-message-delete": false,
  "chat:jobs:cleanup-outbox": false,
  "chat:jobs:recover-stuck-outbox": false,
  "chat:jobs:persist-reactions": false,
  "chat:jobs:reconcile-reactions": false,
  "chat:jobs:batch-read-receipts": false,
  "chat:jobs:reaction-jobs": false,
  // Queries
  "chat:queries:get-history": false,
  "chat:queries:get-messages-delta": false,
  "chat:queries:get-messages-after-cursor": false,
  "chat:queries:get-missing-messages": false,
  "chat:queries:get-message-by-id": false,
  "chat:queries:get-thread-messages": false,
  "chat:queries:get-user-conversations": false,
  "chat:queries:get-conversation": false,
  "chat:queries:get-dm-by-users": false,
  "chat:queries:get-project-dms": false,
  "chat:queries:get-channel-members": false,
  "chat:queries:get-unread-counts": false,
  "chat:queries:get-read-receipts": false,
  "chat:queries:get-last-read-message": false,
  "chat:queries:get-reactions": false,
  "chat:queries:get-message-reactions": false,
  "chat:queries:get-reaction-users": false,
  "chat:queries:get-users-by-ids": false,
  // Services
  "chat:services:create-channel": false,
  "chat:services:create-channel:create": false,
  "chat:services:archive-channel": false,
  "chat:services:unarchive-channel": false,
  "chat:services:rename-channel": false,
  "chat:services:update-channel-description": false,
  "chat:services:update-channel-visibility": false,
  "chat:services:check-channel-availability": false,
  "chat:services:add-channel-members": false,
  "chat:services:remove-channel-member": false,
  "chat:services:create-dm": false,
  "chat:services:create-dm:create": false,
  "chat:services:mute-conversation": false,
  "chat:services:rename-group": false,
  "chat:services:add-group-members": false,
  "chat:services:remove-group-member": false,
  "chat:services:leave-group": false,
  "chat:services:subscribe-thread": false,
  "chat:services:unsubscribe-thread": false,
  "chat:services:close-thread": false,
  "chat:services:reopen-thread": false,
  // Domain
  "chat:domain:reactions:batch": false,
  "chat:domain:reactions:helpers": false,
  "chat:domain:reactions:metrics": false,

  // ─────────────────────────────────────────────────────────────
  // Whiteboard Module
  // ─────────────────────────────────────────────────────────────
  "whiteboard:engine": false,
  // WebSocket handlers
  "whiteboard:ws:subscribe": false,
  "whiteboard:ws:unsubscribe": false,
  "whiteboard:ws:board-update": false,
  "whiteboard:ws:cursor": false,
  "whiteboard:ws:selection": false,
  // Stream Worker V2
  "whiteboard:stream-worker-v2": false,
  "whiteboard:stream-worker-v2:loops": false,
  "whiteboard:stream-worker-v2:processor": false,
  "whiteboard:stream-worker-v2:s3-sync": false,
  // Other infra
  "whiteboard:stream-worker:lua": false,
  "whiteboard:threshold:registry": false,
  "whiteboard:threshold:stream-length": false,
  "whiteboard:infra:s3": false,
  "whiteboard:infra:loop-prevention": false,
  // Jobs
  "whiteboard:jobs:snapshot": false,
  "whiteboard:jobs:cleanup": false,
  // Services
  "whiteboard:services:create-board": false,
  "whiteboard:services:delete-board": false,
  "whiteboard:services:delete-board:cleanup": false,
  // Queries
  "whiteboard:queries:get-snapshot": false,

  // ─────────────────────────────────────────────────────────────
  // Vault Module
  // ─────────────────────────────────────────────────────────────
  "vault:intake": false,
  "vault:proxy": false,
  "vault:infra:pending-cleanup": false,
  // Jobs
  // vault:jobs:index and cleanup-pending are always on so startup + sweep logs are visible
  "vault:jobs:index": false,               // [VAULT_JOBS_STARTED] always visible
  "vault:jobs:cleanup-pending": false,      // pending upload sweep always visible
  "vault:jobs:entity-purge": false,
  // Queries
  "vault:queries:get-node": false,
  "vault:queries:get-children": false,
  "vault:queries:get-ancestors": false,
  "vault:queries:get-sidebar": false,
  "vault:queries:get-download-url": false,
  "vault:queries:get-batch-download-urls": false,
  "vault:queries:get-vault-usage": false,
  // Services — request-upload pipeline
  "vault:services:request-upload": false,
  "vault:services:request-upload:validate": false,
  "vault:services:request-upload:quota": false,
  "vault:services:request-upload:create": false,
  "vault:services:request-upload:presign": false,
  // Services — confirm-upload pipeline
  "vault:services:confirm-upload": false,
  "vault:services:confirm-upload:validate": false,
  "vault:services:confirm-upload:verify-s3": false,
  "vault:services:confirm-upload:activate": false,
  // Services — folder/file management
  "vault:services:create-folder": false,
  "vault:services:delete-folder": false,
  "vault:services:rename-folder": false,
  "vault:services:move-folder": false,
  "vault:services:pin-folder": false,
  "vault:services:unpin-folder": false,
  "vault:services:delete-file": false,
  "vault:services:rename-file": false,
  "vault:services:move-file": false,
  "vault:services:register-external-file": false,
  // Lib
  "vault:lib:quota-guard": false,
  // Media lifecycle pipeline (mark → cleanup → S3 delete)
  // Set to undefined so vault-media-lifecycle FLOW_GROUP controls them.
  // With vault-media-lifecycle: true in GROUPS, these will log automatically.
  // Set to true here for explicit per-file override regardless of GROUPS.
  "vault:services:mark-unreferenced": false, // → vault-media-lifecycle group
  "vault:jobs:unreferenced-cleanup": false,  // → vault-media-lifecycle group
  "vault:lib:is-file-referenced": false,     // → vault-media-lifecycle group

  // ─────────────────────────────────────────────────────────────
  // Pages Module
  // ─────────────────────────────────────────────────────────────
  // WebSocket — subscribe-page
  "pages:ws:subscribe-page": false,
  "pages:ws:subscribe-page:auth-check": false,
  "pages:ws:subscribe-page:fetch-collaborators": false,
  "pages:ws:subscribe-page:replay-gap": false,
  "pages:ws:subscribe-page:track-presence": false,
  "pages:ws:subscribe-page:broadcast-join": false,
  // WebSocket — unsubscribe-page
  "pages:ws:unsubscribe-page": false,
  "pages:ws:unsubscribe-page:broadcast-left": false,
  "pages:ws:unsubscribe-page:bump-epoch": false,
  "pages:ws:unsubscribe-page:cleanup-presence": false,
  "pages:ws:unsubscribe-page:clean-user-state": false,
  "pages:ws:unsubscribe-page:deregister-socket": false,
  // WebSocket — page-update
  "pages:ws:page-update": false,
  "pages:ws:page-update:check-auth": false,
  "pages:ws:page-update:append-to-stream": false,
  "pages:ws:page-update:broadcast": false,
  // WebSocket — awareness
  "pages:ws:awareness-update": false,
  // Queries
  "pages:queries:get-page-snapshot": false,
  "pages:queries:get-page-snapshot:load-snapshot": false,
  "pages:queries:get-page-snapshot:compute-diff": false,
  "pages:queries:get-page-snapshot:apply-stream-delta": false,   // apply-stream-delta.ts
  "pages:queries:get-page-snapshot:bidirectional-sync": false,   // bidirectional-sync.ts
  "pages:queries:get-page": false,
  "pages:queries:get-project-pages": false,
  "pages:queries:get-page-collaborators": false,
  "pages:queries:get-active-page-collaborators": false,
  // Services
  "pages:services:create-page": false,
  "pages:services:delete-page": false,
  "pages:services:rename-page": false,
  "pages:services:lock-page": false,
  "pages:services:unlock-page": false,
  "pages:services:archive-page": false,
  "pages:services:unarchive-page": false,
  "pages:services:reorder-page": false,
  "pages:services:add-page-collaborators": false,
  "pages:services:remove-page-collaborator": false,
  "pages:services:update-page-details": false,
  // Stream Worker
  "pages:stream-worker": false,
  "pages:stream-worker:loops": false,
  "pages:stream-worker:processor": false,
  "pages:stream-worker:threshold-registry": false,
  "pages:stream-worker:threshold:cooldown": false,
  "pages:stream-worker:threshold:stream-length": false,
};

export type GroupFlag = keyof typeof GROUPS;
export type FileFlag = keyof typeof FILES;
