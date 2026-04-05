/**
 * system-grants.ts — Canonical GRANTS for workspace system roles.
 *
 * Single source of truth consumed by:
 *   - src/modules/workspace/services/create-workspace/steps/insert-workspace.ts
 *   - prisma/seeds/repair-role-permissions.ts
 *
 * Rules:
 *   - Resource names use COLON notation (workspace:role, not workspace.role)
 *   - `workspace:create` is intentionally ABSENT — it is a platform-level action,
 *     not a workspace-role permission. No handler ever calls assert("workspace:create").
 *   - `project:create` is a workspace-level action (checked with WorkspaceScope)
 *   - `project:settings:view` granted to OWNER/ADMIN
 */
export const SYSTEM_GRANTS: Array<{ resource: string; action: string; roles: string[] }> = [
  // ── Workspace ─────────────────────────────────────────────────────────────
  // NOTE: workspace:create intentionally omitted — platform-level action, not role-based
  { resource: "workspace",               action: "read",              roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "workspace",               action: "update",            roles: ["OWNER", "ADMIN"] },
  { resource: "workspace",               action: "delete",            roles: ["OWNER"] },
  { resource: "workspace",               action: "transfer",          roles: ["OWNER"] },
  // Workspace members
  { resource: "workspace:member",        action: "invite",            roles: ["OWNER", "ADMIN"] },
  { resource: "workspace:member",        action: "read",              roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "workspace:member",        action: "remove",            roles: ["OWNER", "ADMIN"] },
  { resource: "workspace:member",        action: "role-update",       roles: ["OWNER", "ADMIN"] },
  // Workspace invites
  { resource: "workspace:invite",        action: "view",              roles: ["OWNER", "ADMIN"] },
  { resource: "workspace:invite",        action: "cancel",            roles: ["OWNER", "ADMIN"] },
  { resource: "workspace:invite",        action: "resend",            roles: ["OWNER", "ADMIN"] },
  // Workspace roles
  { resource: "workspace:role",          action: "create",            roles: ["OWNER", "ADMIN"] },
  { resource: "workspace:role",          action: "update",            roles: ["OWNER", "ADMIN"] },
  { resource: "workspace:role",          action: "delete",            roles: ["OWNER", "ADMIN"] },
  { resource: "workspace:role",          action: "assign-permission", roles: ["OWNER", "ADMIN"] },
  // Workspace settings
  { resource: "workspace:settings",      action: "view",              roles: ["OWNER", "ADMIN"] },

  // ── Project ───────────────────────────────────────────────────────────────
  // project:create — WorkspaceScope: creating a project is a workspace-level action.
  { resource: "project",                 action: "create",            roles: ["OWNER", "ADMIN", "MEMBER"] },
  // project:read — WorkspaceScope: listing projects in the workspace.
  // (project-level read is handled by ProjectScope via project membership)
  { resource: "project",                 action: "read",              roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  // NOTE: project:update/delete/archive/member:*/role:*/settings:view are ProjectScope-only.
  // They are enforced via project roles (MANAGER/CONTRIBUTOR/VIEWER) in PROJECT_GRANTS,
  // not via workspace roles. Adding them here would create dead RolePermission rows.

  // ── Chat (dual WorkspaceScope | ProjectScope) ─────────────────────────────
  // These accept WorkspaceScope so workspace roles can read/send in workspace channels.
  // Project-scoped channel actions (create/update/delete/archive, channel:member:*)
  // are ProjectScope-only and belong in PROJECT_GRANTS only.
  { resource: "chat:channel",            action: "read",              roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "chat:message",            action: "send",              roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "chat:message",            action: "read",              roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "chat:message",            action: "edit-own",          roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "chat:message",            action: "delete-own",        roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "chat:message",            action: "delete-any",        roles: ["OWNER", "ADMIN"] },
  { resource: "chat:dm",                 action: "create",            roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "chat:member",             action: "manage",            roles: ["OWNER", "ADMIN"] },

  // ── Vault (WorkspaceScope | ProjectScope | ResourceScope) ─────────────────
  // Vault accepts WorkspaceScope, so workspace roles can access workspace-level vault.
  { resource: "vault",                   action: "read",              roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "vault:file",              action: "upload",            roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "vault:file",              action: "download",          roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "vault:file",              action: "rename",            roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "vault:file",              action: "delete",            roles: ["OWNER", "ADMIN"] },
  { resource: "vault:file",              action: "move",              roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "vault:folder",            action: "create",            roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "vault:folder",            action: "rename",            roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "vault:folder",            action: "delete",            roles: ["OWNER", "ADMIN"] },
  { resource: "vault:folder",            action: "pin",               roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "vault:quota",             action: "view",              roles: ["OWNER", "ADMIN"] },
];

/**
 * PROJECT_GRANTS — Canonical grants for project system roles.
 *
 * Single source of truth consumed by:
 *   - src/modules/project/services/create-project/steps/insert-project.ts
 *
 * Roles: MANAGER (full control), CONTRIBUTOR (read/write content), VIEWER (read-only)
 * Permission strings match app-permissions.ts exactly (colon notation).
 */
export const PROJECT_GRANTS: Array<{ resource: string; action: string; roles: string[] }> = [
  // ── Project ───────────────────────────────────────────────────────────────
  { resource: "project",                  action: "read",              roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "project",                  action: "update",            roles: ["MANAGER"] },
  { resource: "project:member",           action: "read",              roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "project:member",           action: "add",               roles: ["MANAGER"] },
  { resource: "project:member",           action: "remove",            roles: ["MANAGER"] },
  { resource: "project:member",           action: "role-update",       roles: ["MANAGER"] },
  { resource: "project:role",             action: "create",            roles: ["MANAGER"] },
  { resource: "project:role",             action: "update",            roles: ["MANAGER"] },
  { resource: "project:role",             action: "delete",            roles: ["MANAGER"] },
  { resource: "project:settings",         action: "view",              roles: ["MANAGER"] },

  // ── Issues ────────────────────────────────────────────────────────────────
  { resource: "issue",                    action: "create",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue",                    action: "read",              roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "issue",                    action: "update",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue",                    action: "delete",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue",                    action: "assign",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue:status",             action: "manage",            roles: ["MANAGER"] },
  { resource: "issue:label",              action: "manage",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue:comment",            action: "create",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue:comment",            action: "delete",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue:comment",            action: "delete-any",        roles: ["MANAGER"] },

  // ── Pages ─────────────────────────────────────────────────────────────────
  { resource: "page",                     action: "create",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "page",                     action: "read",              roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "page",                     action: "update",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "page",                     action: "delete",            roles: ["MANAGER"] },
  { resource: "page",                     action: "archive",           roles: ["MANAGER"] },
  { resource: "page",                     action: "lock",              roles: ["MANAGER"] },
  { resource: "page",                     action: "share",             roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "page:collaborator",        action: "read",              roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "page:collaborator",        action: "add",               roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "page:collaborator",        action: "remove",            roles: ["MANAGER"] },

  // ── Whiteboard ────────────────────────────────────────────────────────────
  { resource: "whiteboard",               action: "create",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "whiteboard",               action: "read",              roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "whiteboard",               action: "edit",              roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "whiteboard",               action: "update",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "whiteboard",               action: "delete",            roles: ["MANAGER"] },
  { resource: "whiteboard",               action: "archive",           roles: ["MANAGER"] },
  { resource: "whiteboard",               action: "lock",              roles: ["MANAGER"] },
  { resource: "whiteboard",               action: "share",             roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "whiteboard:collaborator",  action: "read",              roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "whiteboard:collaborator",  action: "add",               roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "whiteboard:collaborator",  action: "remove",            roles: ["MANAGER"] },

  // ── Chat (project-scoped channels) ────────────────────────────────────────
  { resource: "chat:channel",             action: "create",            roles: ["MANAGER"] },
  { resource: "chat:channel",             action: "read",              roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "chat:channel",             action: "update",            roles: ["MANAGER"] },
  { resource: "chat:channel",             action: "delete",            roles: ["MANAGER"] },
  { resource: "chat:channel",             action: "archive",           roles: ["MANAGER"] },
  { resource: "chat:channel:member",      action: "read",              roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "chat:channel:member",      action: "add",               roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "chat:channel:member",      action: "remove",            roles: ["MANAGER"] },
  { resource: "chat:message",             action: "send",              roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "chat:message",             action: "read",              roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "chat:message",             action: "edit-own",          roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "chat:message",             action: "delete-own",        roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "chat:message",             action: "delete-any",        roles: ["MANAGER"] },

  // ── Vault ─────────────────────────────────────────────────────────────────
  { resource: "vault",                    action: "read",              roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "vault:file",               action: "upload",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "vault:file",               action: "download",          roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "vault:file",               action: "rename",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "vault:file",               action: "delete",            roles: ["MANAGER"] },
  { resource: "vault:file",               action: "move",              roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "vault:folder",             action: "create",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "vault:folder",             action: "rename",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "vault:folder",             action: "delete",            roles: ["MANAGER"] },
  { resource: "vault:folder",             action: "pin",               roles: ["MANAGER", "CONTRIBUTOR"] },
];
