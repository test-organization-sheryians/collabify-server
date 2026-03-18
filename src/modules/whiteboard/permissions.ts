/**
 * Whiteboard module — permission manifest.
 */
export const BOARD_PERMISSIONS = [
  {
    resource: "board",
    action: "create",
    module: "whiteboard",
    description: "Create a whiteboard",
    hasConditions: false,
  },
  {
    resource: "board",
    action: "read",
    module: "whiteboard",
    description: "View a whiteboard",
    hasConditions: false,
  },
  {
    resource: "board",
    action: "update",
    module: "whiteboard",
    description: "Edit board content / rename",
    hasConditions: false,
  },
  {
    resource: "board",
    action: "delete",
    module: "whiteboard",
    description: "Delete a whiteboard",
    hasConditions: false,
  },
  {
    resource: "board",
    action: "archive",
    module: "whiteboard",
    description: "Archive / unarchive a whiteboard",
    hasConditions: false,
  },
  {
    resource: "board",
    action: "lock",
    module: "whiteboard",
    description: "Lock / unlock a whiteboard",
    hasConditions: false,
  },
  // Collaborators
  {
    resource: "board.collaborator",
    action: "read",
    module: "whiteboard",
    description: "List board collaborators",
    hasConditions: false,
  },
  {
    resource: "board.collaborator",
    action: "add",
    module: "whiteboard",
    description: "Add a board collaborator",
    hasConditions: false,
  },
  {
    resource: "board.collaborator",
    action: "remove",
    module: "whiteboard",
    description: "Remove a board collaborator",
    hasConditions: false,
  },
] as const;
