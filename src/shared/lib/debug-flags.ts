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
  api: false,
  auth: false,
  db: false,
  ws: false,
  infra: false,
  shared: false,
  services: false,
  modules: false,
  stream: false,
} as const;

// ═══════════════════════════════════════════════════════════════
// FILE FLAGS (granular per-file control)
// ═══════════════════════════════════════════════════════════════
export const FILES: Record<string, boolean | undefined> = {
  // Add backend flags here as needed
  "db:setup": undefined,
  "ws:connection": undefined,
  "ws:events": undefined,
  "api:handler": undefined,
  "app:server": undefined,
  "app:webhooks": undefined,
  "app:middlewares": undefined,
  "app:graphql": undefined,
  "infra:db": undefined,
  "infra:redis": undefined,
  "infra:email": undefined,
  "infra:streams": undefined,
  "infra:s3": undefined,
  "infra:ses": undefined,
  "infra:ws:gateway": undefined,
  "infra:ws:router": undefined,
  "infra:ws:worker": undefined,
  "infra:ws:registry": undefined,
  "chat:engine": undefined,
  // Chat Jobs
  "chat:jobs:index": undefined,
  "chat:jobs:persist-message": undefined,
  "chat:jobs:persist-message-edit": undefined,
  "chat:jobs:persist-message-delete": undefined,
  "chat:jobs:cleanup-outbox": undefined,
  "chat:jobs:recover-stuck-outbox": undefined,
  "chat:jobs:persist-reactions": undefined,
  "chat:jobs:reconcile-reactions": undefined,
  "chat:jobs:batch-read-receipts": undefined,
  "chat:jobs:reaction-jobs": undefined,
  // Chat WS
  "chat:ws:router": undefined,
  "chat:ws:send-message": undefined,
  "chat:ws:edit-message": undefined,
  "chat:ws:delete-message": undefined,
  "chat:ws:subscribe": undefined,
  "chat:ws:unsubscribe": undefined,
  "chat:ws:add-reaction": undefined,
  "chat:ws:remove-reaction": undefined,
  "chat:ws:mark-read": undefined,
  "chat:ws:typing-start": undefined,
  "chat:ws:typing-stop": undefined,
  "chat:ws:user-typing": undefined,
  "chat:ws:user-stop-typing": undefined,
  // Chat Services & Queries
  "chat:services:create-channel": undefined,
  "chat:queries:get-reactions": undefined,
  // Chat Domain
  "chat:domain:reactions:batch": undefined,
  "chat:domain:reactions:helpers": undefined,
  "chat:domain:reactions:metrics": undefined,
  // ─────────────────────────────────────
  // Whiteboard Module
  // ─────────────────────────────────────
  "whiteboard:engine": undefined,
  "whiteboard:ws:subscribe": undefined,
  "whiteboard:ws:unsubscribe": undefined,
  "whiteboard:ws:board-update": undefined,
  "whiteboard:ws:cursor": undefined,
  "whiteboard:ws:selection": undefined,
  "whiteboard:infra:stream-worker": undefined,
  "whiteboard:infra:s3": undefined,
  "whiteboard:infra:loop-prevention": undefined,
  "whiteboard:jobs:snapshot": undefined,
  "whiteboard:jobs:cleanup": undefined,
  "whiteboard:services:create-board": undefined,
  "whiteboard:queries:get-snapshot": undefined,
  // ─────────────────────────────────────
  // Internal Module
  // ─────────────────────────────────────
  "internal:assign-workspace": undefined,
  "internal:metrics": undefined,
  // ─────────────────────────────────────
  // Notification Module
  // ─────────────────────────────────────
  "notification:engine:bootstrap": undefined,
  "notification:engine:poller": undefined,
  "notification:engine:fan-out": undefined,
  "notification:engine:decider": undefined,
  "notification:engine:batch": undefined,
  "notification:engine:recovery": undefined,
  "notification:engine:cleanup": undefined,
  "notification:channel:email": undefined,
  "notification:channel:push": undefined,
  "notification:channel:in-app": undefined,
  "notification:channel:realtime": undefined,
  "notification:services:read": undefined,
  // ─────────────────────────────────────
  // User Module
  // ─────────────────────────────────────
  "user:services:sync": undefined,
  "user:queries:me": undefined,
  // ─────────────────────────────────────
  // Workspace Module
  // ─────────────────────────────────────
  "workspace:services:create": undefined,
  "workspace:services:onboarding": undefined,
  "workspace:services:invite": undefined,
  "workspace:services:slug": undefined,
  "workspace:services:member": undefined,
  // ─────────────────────────────────────
  // Project Module
  // ─────────────────────────────────────
  "project:services:create": undefined,
  "project:queries:get": undefined,
  // ─────────────────────────────────────
  // Quota Module
  // ─────────────────────────────────────
  "quota:enforce": undefined,
  // ─────────────────────────────────────
  // Infrastructure & Services (Core)
  // ─────────────────────────────────────
  "services:bullmq": undefined,
  "services:clerk": undefined,
  "services:providers": undefined,
};

export type GroupFlag = keyof typeof GROUPS;
export type FileFlag = keyof typeof FILES;
