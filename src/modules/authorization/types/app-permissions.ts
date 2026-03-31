/**
 * app-permissions.ts — Canonical AppPermission union type.
 *
 * ⚠️  GENERATED FILE — DO NOT EDIT MANUALLY.
 * Run: bun run scripts/sync-permissions.ts
 *
 * Source: server/src/modules/[module]/permissions.ts
 * Last generated: 2026-03-31
 */

// Workspace
type WorkspacePermission =
  | "workspace:create"
  | "workspace:read"
  | "workspace:update"
  | "workspace:delete"
  | "workspace:transfer"
  | "workspace:member:invite"
  | "workspace:member:read"
  | "workspace:member:remove"
  | "workspace:member:role-update"
  | "workspace:invite:view"
  | "workspace:invite:cancel"
  | "workspace:invite:resend"
  | "workspace:role:create"
  | "workspace:role:update"
  | "workspace:role:delete"
  | "workspace:role:assign-permission"
  | "workspace:settings:view"

// Project
type ProjectPermission =
  | "project:create"
  | "project:read"
  | "project:update"
  | "project:delete"
  | "project:archive"
  | "project:member:read"
  | "project:member:add"
  | "project:member:remove"
  | "project:member:role-update"
  | "project:role:create"
  | "project:role:update"
  | "project:role:delete"
  | "project:settings:view"

// Issues
type IssuePermission =
  | "issue:create"
  | "issue:read"
  | "issue:update"
  | "issue:delete"
  | "issue:assign"
  | "issue:status:manage"
  | "issue:label:manage"
  | "issue:comment:create"
  | "issue:comment:delete"
  | "issue:comment:delete-any"

// Pages
type PagePermission =
  | "page:create"
  | "page:read"
  | "page:update"
  | "page:delete"
  | "page:archive"
  | "page:lock"
  | "page:share"
  | "page:collaborator:read"
  | "page:collaborator:add"
  | "page:collaborator:remove"

// Whiteboard
type BoardPermission =
  | "whiteboard:create"
  | "whiteboard:read"
  | "whiteboard:edit"
  | "whiteboard:update"
  | "whiteboard:delete"
  | "whiteboard:archive"
  | "whiteboard:lock"
  | "whiteboard:share"
  | "whiteboard:collaborator:read"
  | "whiteboard:collaborator:add"
  | "whiteboard:collaborator:remove"

// Chat
type ChatPermission =
  | "chat:channel:create"
  | "chat:channel:read"
  | "chat:channel:update"
  | "chat:channel:delete"
  | "chat:channel:archive"
  | "chat:channel:member:read"
  | "chat:channel:member:add"
  | "chat:channel:member:remove"
  | "chat:message:send"
  | "chat:message:read"
  | "chat:message:edit-own"
  | "chat:message:delete-own"
  | "chat:message:delete-any"
  | "chat:dm:create"
  | "chat:member:manage"

// Vault
type VaultPermission =
  | "vault:read"
  | "vault:file:upload"
  | "vault:file:download"
  | "vault:file:rename"
  | "vault:file:delete"
  | "vault:file:move"
  | "vault:folder:create"
  | "vault:folder:rename"
  | "vault:folder:delete"
  | "vault:folder:pin"
  | "vault:quota:view"

/**
 * AppPermission — complete union of all granular permissions in the system.
 * Used for compile-time safety on all permission.assert() calls.
 */
export type AppPermission =
  | WorkspacePermission
  | ProjectPermission
  | IssuePermission
  | PagePermission
  | BoardPermission
  | ChatPermission
  | VaultPermission
