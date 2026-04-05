/**
 * app-permissions.ts — Canonical AppPermission union type.
 *
 * GENERATED FILE — DO NOT EDIT MANUALLY.
 * Run: bun run scripts/sync-permissions.ts
 *
 * Source: server/src/modules/[module]/permissions.ts
 * Last generated: 2026-04-01
 */

import type { WorkspaceScope, ProjectScope, ResourceScope } from "./permission-types";

// Workspace
// NOTE: "workspace:create" is intentionally absent — it is a platform-level action
// checked via session auth only, not an RBAC role permission.
type WorkspacePermission =
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
  | VaultPermission;

/**
 * PermissionScopeMap — maps every specific permission to its valid scope payloads.
 * Exclusively generated to strictly enforce bounds in PermissionEngine.
 */
export interface PermissionScopeMap {
  // Workspace
  // NOTE: "workspace:create" intentionally absent — platform-level action, not RBAC.
  "workspace:read": WorkspaceScope;
  "workspace:update": WorkspaceScope;
  "workspace:delete": WorkspaceScope;
  "workspace:transfer": WorkspaceScope;
  "workspace:member:invite": WorkspaceScope;
  "workspace:member:read": WorkspaceScope;
  "workspace:member:remove": WorkspaceScope;
  "workspace:member:role-update": WorkspaceScope;
  "workspace:invite:view": WorkspaceScope;
  "workspace:invite:cancel": WorkspaceScope;
  "workspace:invite:resend": WorkspaceScope;
  "workspace:role:create": WorkspaceScope;
  "workspace:role:update": WorkspaceScope;
  "workspace:role:delete": WorkspaceScope;
  "workspace:role:assign-permission": WorkspaceScope;
  "workspace:settings:view": WorkspaceScope;

  // Project
  // project:create — WorkspaceScope only: creating a project is a workspace-level action.
  // Handlers always call assert("project:create", { type:"workspace", id: workspaceId }).
  "project:create": WorkspaceScope;
  // project:read — dual scope: WorkspaceScope for listing projects, ProjectScope for reading one.
  "project:read": WorkspaceScope | ProjectScope;
  "project:update": ProjectScope;
  "project:delete": ProjectScope;
  "project:archive": ProjectScope;
  "project:member:read": ProjectScope;
  "project:member:add": ProjectScope;
  "project:member:remove": ProjectScope;
  "project:member:role-update": ProjectScope;
  "project:role:create": ProjectScope;
  "project:role:update": ProjectScope;
  "project:role:delete": ProjectScope;
  "project:settings:view": ProjectScope;

  // Issues — always live inside a project; WorkspaceScope skips project-role
  // evaluation in the resolver and will produce false 403s for project members.
  "issue:create": ProjectScope | ResourceScope;
  "issue:read": ProjectScope | ResourceScope;
  "issue:update": ProjectScope | ResourceScope;
  "issue:delete": ProjectScope | ResourceScope;
  "issue:assign": ProjectScope | ResourceScope;
  "issue:status:manage": ProjectScope | ResourceScope;
  "issue:label:manage": ProjectScope | ResourceScope;
  "issue:comment:create": ProjectScope | ResourceScope;
  "issue:comment:delete": ProjectScope | ResourceScope;
  "issue:comment:delete-any": ProjectScope | ResourceScope;

  // Pages — always live inside a project; WorkspaceScope skips project-role
  // evaluation in the resolver and will produce false 403s for project members.
  "page:create": ProjectScope | ResourceScope;
  "page:read": ProjectScope | ResourceScope;
  "page:update": ProjectScope | ResourceScope;
  "page:delete": ProjectScope | ResourceScope;
  "page:archive": ProjectScope | ResourceScope;
  "page:lock": ProjectScope | ResourceScope;
  "page:share": ProjectScope | ResourceScope;
  "page:collaborator:read": ProjectScope | ResourceScope;
  "page:collaborator:add": ProjectScope | ResourceScope;
  "page:collaborator:remove": ProjectScope | ResourceScope;

  // Whiteboard — always live inside a project; WorkspaceScope skips project-role
  // evaluation in the resolver and will produce false 403s for project members.
  "whiteboard:create": ProjectScope | ResourceScope;
  "whiteboard:read": ProjectScope | ResourceScope;
  "whiteboard:edit": ProjectScope | ResourceScope;
  "whiteboard:update": ProjectScope | ResourceScope;
  "whiteboard:delete": ProjectScope | ResourceScope;
  "whiteboard:archive": ProjectScope | ResourceScope;
  "whiteboard:lock": ProjectScope | ResourceScope;
  "whiteboard:share": ProjectScope | ResourceScope;
  "whiteboard:collaborator:read": ProjectScope | ResourceScope;
  "whiteboard:collaborator:add": ProjectScope | ResourceScope;
  "whiteboard:collaborator:remove": ProjectScope | ResourceScope;

  // Chat
  "chat:channel:create": ProjectScope;
  "chat:channel:read": WorkspaceScope | ProjectScope;
  "chat:channel:update": ProjectScope;
  "chat:channel:delete": ProjectScope;
  "chat:channel:archive": ProjectScope;
  "chat:channel:member:read": ProjectScope;
  "chat:channel:member:add": ProjectScope;
  "chat:channel:member:remove": ProjectScope;
  "chat:message:send": WorkspaceScope | ProjectScope;
  "chat:message:read": WorkspaceScope | ProjectScope;
  "chat:message:edit-own": WorkspaceScope | ProjectScope;
  "chat:message:delete-own": WorkspaceScope | ProjectScope;
  "chat:message:delete-any": WorkspaceScope | ProjectScope;
  "chat:dm:create": WorkspaceScope | ProjectScope;
  "chat:member:manage": WorkspaceScope | ProjectScope;

  // Vault
  "vault:read": WorkspaceScope | ProjectScope | ResourceScope;
  "vault:file:upload": WorkspaceScope | ProjectScope | ResourceScope;
  "vault:file:download": WorkspaceScope | ProjectScope | ResourceScope;
  "vault:file:rename": WorkspaceScope | ProjectScope | ResourceScope;
  "vault:file:delete": WorkspaceScope | ProjectScope | ResourceScope;
  "vault:file:move": WorkspaceScope | ProjectScope | ResourceScope;
  "vault:folder:create": WorkspaceScope | ProjectScope | ResourceScope;
  "vault:folder:rename": WorkspaceScope | ProjectScope | ResourceScope;
  "vault:folder:delete": WorkspaceScope | ProjectScope | ResourceScope;
  "vault:folder:pin": WorkspaceScope | ProjectScope | ResourceScope;
  "vault:quota:view": WorkspaceScope | ProjectScope | ResourceScope;
}
