/**
 * Workspace module — permission manifest.
 *
 * Convention: resource uses COLON-separated hierarchy (no dots).
 * Permission string = `${resource}:${action}`
 *
 * @example "workspace:member:invite", "workspace:role:create"
 */
export const WORKSPACE_PERMISSIONS = [
  // ── Core workspace ───────────────────────────────────────────────────────────
  // NOTE: workspace:create intentionally omitted — it is a platform-level action
  // (you cannot be a workspace member to create a workspace). Auth is enforced
  // via session checks in the create-workspace handler, not RBAC role permissions.
  {
    resource: "workspace",
    action: "read",
    module: "workspace",
    description: "View workspace details",
    hasConditions: false,
  },
  {
    resource: "workspace",
    action: "update",
    module: "workspace",
    description: "Update workspace name/slug/settings",
    hasConditions: false,
  },
  {
    resource: "workspace",
    action: "delete",
    module: "workspace",
    description: "Delete a workspace",
    hasConditions: false,
  },
  {
    resource: "workspace",
    action: "transfer",
    module: "workspace",
    description: "Transfer workspace ownership to another member",
    hasConditions: false,
  },
  // ── Member management ────────────────────────────────────────────────────────
  {
    resource: "workspace:member",
    action: "invite",
    module: "workspace",
    description: "Invite users to workspace",
    hasConditions: false,
  },
  {
    resource: "workspace:member",
    action: "read",
    module: "workspace",
    description: "List workspace members",
    hasConditions: false,
  },
  {
    resource: "workspace:member",
    action: "remove",
    module: "workspace",
    description: "Remove a member from the workspace",
    hasConditions: false,
  },
  {
    resource: "workspace:member",
    action: "role-update",
    module: "workspace",
    description: "Update a member's assigned role",
    hasConditions: false,
  },
  // ── Invite management ────────────────────────────────────────────────────────
  {
    resource: "workspace:invite",
    action: "view",
    module: "workspace",
    description: "View pending workspace invites",
    hasConditions: false,
  },
  {
    resource: "workspace:invite",
    action: "cancel",
    module: "workspace",
    description: "Cancel a pending workspace invite",
    hasConditions: false,
  },
  {
    resource: "workspace:invite",
    action: "resend",
    module: "workspace",
    description: "Resend a pending workspace invite email",
    hasConditions: false,
  },
  // ── Role management ──────────────────────────────────────────────────────────
  {
    resource: "workspace:role",
    action: "create",
    module: "workspace",
    description: "Create a custom workspace role",
    hasConditions: false,
  },
  {
    resource: "workspace:role",
    action: "update",
    module: "workspace",
    description: "Update a custom workspace role name or description",
    hasConditions: false,
  },
  {
    resource: "workspace:role",
    action: "delete",
    module: "workspace",
    description: "Delete a custom workspace role",
    hasConditions: false,
  },
  {
    resource: "workspace:role",
    action: "assign-permission",
    module: "workspace",
    description: "Assign or revoke permissions on a workspace role",
    hasConditions: false,
  },
  // ── Settings access ──────────────────────────────────────────────────────────
  {
    resource: "workspace:settings",
    action: "view",
    module: "workspace",
    description: "Access the workspace settings page",
    hasConditions: false,
  },
] as const;
