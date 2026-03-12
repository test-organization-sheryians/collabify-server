/**
 * Workspace module — permission manifest.
 */
export const WORKSPACE_PERMISSIONS = [
  {
    resource: "workspace",
    action: "create",
    module: "workspace",
    description: "Create a workspace",
    hasConditions: false,
  },
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
    description: "Transfer workspace ownership",
    hasConditions: false,
  },
  // Member management
  {
    resource: "workspace.member",
    action: "invite",
    module: "workspace",
    description: "Invite users to workspace",
    hasConditions: false,
  },
  {
    resource: "workspace.member",
    action: "read",
    module: "workspace",
    description: "List workspace members",
    hasConditions: false,
  },
  {
    resource: "workspace.member",
    action: "remove",
    module: "workspace",
    description: "Remove a member",
    hasConditions: false,
  },
  {
    resource: "workspace.member",
    action: "role-update",
    module: "workspace",
    description: "Update a member's role",
    hasConditions: false,
  },
] as const;
