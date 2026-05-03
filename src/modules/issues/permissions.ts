/**
 * Issue module — permission manifest.
 *
 * Convention: resource uses COLON-separated hierarchy (no dots).
 * Permission string = `${resource}:${action}`
 *
 * @example "issue:create", "issue:status:manage", "issue:comment:delete-any"
 */
export const ISSUE_PERMISSIONS = [
  // ── Core issue CRUD ──────────────────────────────────────────────────────────
  {
    resource: "issue",
    action: "create",
    module: "issues",
    description: "Create a new issue",
    hasConditions: false,
  },
  {
    resource: "issue",
    action: "read",
    module: "issues",
    description: "Read issue details",
    hasConditions: false,
  },
  {
    resource: "issue",
    action: "update",
    module: "issues",
    description: "Edit issue title, description, and fields",
    hasConditions: false,
  },
  {
    resource: "issue",
    action: "delete",
    module: "issues",
    description: "Delete an issue",
    hasConditions: false,
  },
  {
    resource: "issue",
    action: "assign",
    module: "issues",
    description: "Assign or unassign members to an issue",
    hasConditions: false,
  },
  // ── Status (Kanban columns) ──────────────────────────────────────────────────
  {
    resource: "issue:status",
    action: "manage",
    module: "issues",
    description: "Create, reorder, and delete issue status columns",
    hasConditions: false,
  },
  // ── Labels ───────────────────────────────────────────────────────────────────
  {
    resource: "issue:label",
    action: "manage",
    module: "issues",
    description: "Create, update, and delete issue labels",
    hasConditions: false,
  },
  // ── Comments ─────────────────────────────────────────────────────────────────
  {
    resource: "issue:comment",
    action: "create",
    module: "issues",
    description: "Add a comment to an issue",
    hasConditions: false,
  },
  {
    resource: "issue:comment",
    action: "delete",
    module: "issues",
    description: "Delete own comments",
    hasConditions: true, // createdBy condition
  },
  {
    resource: "issue:comment",
    action: "delete-any",
    module: "issues",
    description: "Delete any comment (manager/admin action)",
    hasConditions: false,
  },
] as const;
