/**
 * Whiteboard module — permission manifest.
 *
 * Convention: resource uses COLON-separated hierarchy (no dots).
 * Permission string = `${resource}:${action}`
 *
 * Domain prefix: "whiteboard" (not "board" — use the full domain name).
 *
 * @example "whiteboard:create", "whiteboard:delete", "whiteboard:collaborator:add"
 */
export const BOARD_PERMISSIONS = [
  // ── Core whiteboard ──────────────────────────────────────────────────────────
  {
    resource: "whiteboard",
    action: "create",
    module: "whiteboard",
    description: "Create a whiteboard",
    hasConditions: false,
  },
  {
    resource: "whiteboard",
    action: "read",
    module: "whiteboard",
    description: "View a whiteboard",
    hasConditions: false,
  },
  {
    resource: "whiteboard",
    action: "edit",
    module: "whiteboard",
    description: "Edit whiteboard canvas content",
    hasConditions: false,
  },
  {
    resource: "whiteboard",
    action: "update",
    module: "whiteboard",
    description: "Update whiteboard metadata (name, description)",
    hasConditions: false,
  },
  {
    resource: "whiteboard",
    action: "delete",
    module: "whiteboard",
    description: "Delete a whiteboard",
    hasConditions: false,
  },
  {
    resource: "whiteboard",
    action: "archive",
    module: "whiteboard",
    description: "Archive or unarchive a whiteboard",
    hasConditions: false,
  },
  {
    resource: "whiteboard",
    action: "lock",
    module: "whiteboard",
    description: "Lock or unlock a whiteboard to prevent edits",
    hasConditions: false,
  },
  {
    resource: "whiteboard",
    action: "share",
    module: "whiteboard",
    description: "Manage whiteboard collaborators and sharing",
    hasConditions: false,
  },
  // ── Collaborators ────────────────────────────────────────────────────────────
  {
    resource: "whiteboard:collaborator",
    action: "read",
    module: "whiteboard",
    description: "List whiteboard collaborators",
    hasConditions: false,
  },
  {
    resource: "whiteboard:collaborator",
    action: "add",
    module: "whiteboard",
    description: "Add a whiteboard collaborator",
    hasConditions: false,
  },
  {
    resource: "whiteboard:collaborator",
    action: "remove",
    module: "whiteboard",
    description: "Remove a whiteboard collaborator",
    hasConditions: false,
  },
] as const;
