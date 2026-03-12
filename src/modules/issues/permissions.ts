/**
 * Issue module — permission manifest.
 * Each entry seeds one row in the `Permission` table.
 * hasConditions = true means the engine will call resolver with a resourceContext.
 */
export const ISSUE_PERMISSIONS = [
  // Core issue CRUD
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
    description: "Edit issue title/description/fields",
    hasConditions: false,
  },
  {
    resource: "issue",
    action: "delete",
    module: "issues",
    description: "Delete an issue",
    hasConditions: false,
  },
  // Issue status (Kanban columns)
  {
    resource: "issue.status",
    action: "create",
    module: "issues",
    description: "Create a new status column",
    hasConditions: false,
  },
  {
    resource: "issue.status",
    action: "read",
    module: "issues",
    description: "List status columns",
    hasConditions: false,
  },
  {
    resource: "issue.status",
    action: "update",
    module: "issues",
    description: "Edit status name/color/icon",
    hasConditions: false,
  },
  {
    resource: "issue.status",
    action: "delete",
    module: "issues",
    description: "Delete a status column",
    hasConditions: false,
  },
  // Issue labels
  {
    resource: "issue.label",
    action: "create",
    module: "issues",
    description: "Create a label",
    hasConditions: false,
  },
  {
    resource: "issue.label",
    action: "read",
    module: "issues",
    description: "List labels",
    hasConditions: false,
  },
  {
    resource: "issue.label",
    action: "update",
    module: "issues",
    description: "Edit label name/color",
    hasConditions: false,
  },
  {
    resource: "issue.label",
    action: "delete",
    module: "issues",
    description: "Delete a label",
    hasConditions: false,
  },
] as const;
