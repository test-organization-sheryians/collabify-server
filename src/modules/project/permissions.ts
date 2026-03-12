/**
 * Project module — permission manifest.
 */
export const PROJECT_PERMISSIONS = [
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
    description: "Archive / unarchive project",
    hasConditions: false,
  },
  // Member management
  {
    resource: "project.member",
    action: "read",
    module: "project",
    description: "List project members",
    hasConditions: false,
  },
  {
    resource: "project.member",
    action: "add",
    module: "project",
    description: "Add a member to a project",
    hasConditions: false,
  },
  {
    resource: "project.member",
    action: "remove",
    module: "project",
    description: "Remove a member from a project",
    hasConditions: false,
  },
  {
    resource: "project.member",
    action: "role-update",
    module: "project",
    description: "Update a project member's role",
    hasConditions: false,
  },
] as const;
