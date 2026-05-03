/**
 * Chat module — permission manifest.
 *
 * Convention: resource uses COLON-separated hierarchy (no dots).
 * All chat resources are prefixed with "chat:" to avoid collisions with
 * other modules (e.g. page:member, project:member).
 *
 * Permission string = `${resource}:${action}`
 *
 * @example "chat:channel:create", "chat:message:send", "chat:dm:create"
 */
export const CHAT_PERMISSIONS = [
  // ── Channels ─────────────────────────────────────────────────────────────────
  {
    resource: "chat:channel",
    action: "create",
    module: "chat",
    description: "Create a channel",
    hasConditions: false,
  },
  {
    resource: "chat:channel",
    action: "read",
    module: "chat",
    description: "View channel details and message history",
    hasConditions: false,
  },
  {
    resource: "chat:channel",
    action: "update",
    module: "chat",
    description: "Edit channel name or description",
    hasConditions: false,
  },
  {
    resource: "chat:channel",
    action: "delete",
    module: "chat",
    description: "Delete a channel",
    hasConditions: false,
  },
  {
    resource: "chat:channel",
    action: "archive",
    module: "chat",
    description: "Archive or unarchive a channel",
    hasConditions: false,
  },
  // ── Channel members ──────────────────────────────────────────────────────────
  {
    resource: "chat:channel:member",
    action: "read",
    module: "chat",
    description: "List channel members",
    hasConditions: false,
  },
  {
    resource: "chat:channel:member",
    action: "add",
    module: "chat",
    description: "Add a member to a channel",
    hasConditions: false,
  },
  {
    resource: "chat:channel:member",
    action: "remove",
    module: "chat",
    description: "Remove a member from a channel",
    hasConditions: false,
  },
  // ── Messages ─────────────────────────────────────────────────────────────────
  {
    resource: "chat:message",
    action: "send",
    module: "chat",
    description: "Send a message in a channel or conversation",
    hasConditions: false,
  },
  {
    resource: "chat:message",
    action: "read",
    module: "chat",
    description: "Read messages",
    hasConditions: false,
  },
  {
    resource: "chat:message",
    action: "edit-own",
    module: "chat",
    description: "Edit own messages",
    hasConditions: true, // createdBy condition
  },
  {
    resource: "chat:message",
    action: "delete-own",
    module: "chat",
    description: "Delete own messages",
    hasConditions: true, // createdBy condition
  },
  {
    resource: "chat:message",
    action: "delete-any",
    module: "chat",
    description: "Delete any message (channel owner / project manager)",
    hasConditions: false,
  },
  // ── Direct messages ──────────────────────────────────────────────────────────
  {
    resource: "chat:dm",
    action: "create",
    module: "chat",
    description: "Create a direct message conversation",
    hasConditions: false,
  },
  // ── Member management ────────────────────────────────────────────────────────
  {
    resource: "chat:member",
    action: "manage",
    module: "chat",
    description: "Add or remove channel members",
    hasConditions: false,
  },
] as const;
