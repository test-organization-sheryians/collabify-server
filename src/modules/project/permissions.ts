/**
 * Project module — permission manifest.
 *
 * Convention: resource uses COLON-separated hierarchy (no dots).
 * Permission string = `${resource}:${action}`
 *
 * @example "project:member:add", "project:role:create"
 */
export const PROJECT_PERMISSIONS = [
  // ── Core project ─────────────────────────────────────────────────────────────
  {
    resource: "project",
    action: "create",
    module: "project",
    description: "Create a project",
    hasConditions: false,
  },
  {
    resource: "project",
    action: "read",
    module: "project",
    description: "View project details",
    hasConditions: false,
  },
  {
    resource: "project",
    action: "update",
    module: "project",
    description: "Update project settings",
    hasConditions: false,
  },
  {
    resource: "project",
    action: "delete",
    module: "project",
    description: "Delete a project",
    hasConditions: false,
  },
  {
    resource: "project",
    action: "archive",
    module: "project",
    description: "Archive or unarchive a project",
    hasConditions: false,
  },
  // ── Member management ────────────────────────────────────────────────────────
  {
    resource: "project:member",
    action: "read",
    module: "project",
    description: "List project members",
    hasConditions: false,
  },
  {
    resource: "project:member",
    action: "add",
    module: "project",
    description: "Add a member to a project",
    hasConditions: false,
  },
  {
    resource: "project:member",
    action: "remove",
    module: "project",
    description: "Remove a member from a project",
    hasConditions: false,
  },
  {
    resource: "project:member",
    action: "role-update",
    module: "project",
    description: "Update a project member's role",
    hasConditions: false,
  },
  // ── Role management ──────────────────────────────────────────────────────────
  {
    resource: "project:role",
    action: "create",
    module: "project",
    description: "Create a custom project role",
    hasConditions: false,
  },
  {
    resource: "project:role",
    action: "update",
    module: "project",
    description: "Update a custom project role name or description",
    hasConditions: false,
  },
  {
    resource: "project:role",
    action: "delete",
    module: "project",
    description: "Delete a custom project role",
    hasConditions: false,
  },
  {
    resource: "project:role",
    action: "assign-permission",
    module: "project",
    description: "Assign or revoke permissions on a project role",
    hasConditions: false,
  },
  // ── Settings access ──────────────────────────────────────────────────────────
  {
    resource: "project:settings",
    action: "view",
    module: "project",
    description: "Access the project settings page",
    hasConditions: false,
  },
] as const;
