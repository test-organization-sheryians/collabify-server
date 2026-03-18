/**
 * Chat module — permission manifest.
 * Each entry seeds one row in the `Permission` table.
 */
export const CHAT_PERMISSIONS = [
  // ── Channels ────────────────────────────────────────────────────────────────
  {
    resource: "channel",
    action: "create",
    module: "chat",
    description: "Create a channel",
    hasConditions: false,
  },
  {
    resource: "channel",
    action: "read",
    module: "chat",
    description: "View channel details",
    hasConditions: false,
  },
  {
    resource: "channel",
    action: "update",
    module: "chat",
    description: "Edit channel name/description",
    hasConditions: false,
  },
  {
    resource: "channel",
    action: "delete",
    module: "chat",
    description: "Delete a channel",
    hasConditions: false,
  },
  {
    resource: "channel",
    action: "archive",
    module: "chat",
    description: "Archive / unarchive a channel",
    hasConditions: false,
  },
  // ── Channel members ──────────────────────────────────────────────────────────
  {
    resource: "channel.member",
    action: "read",
    module: "chat",
    description: "List channel members",
    hasConditions: false,
  },
  {
    resource: "channel.member",
    action: "add",
    module: "chat",
    description: "Add member to channel",
    hasConditions: false,
  },
  {
    resource: "channel.member",
    action: "remove",
    module: "chat",
    description: "Remove member from channel",
    hasConditions: false,
  },
  // ── Conversations (DMs, Groups, Threads) ─────────────────────────────────────
  {
    resource: "conversation",
    action: "create",
    module: "chat",
    description: "Create a DM, group, or thread conversation",
    hasConditions: false,
  },
  {
    resource: "conversation",
    action: "read",
    module: "chat",
    description: "Read conversation details and message history",
    hasConditions: false,
  },
  {
    resource: "conversation",
    action: "update",
    module: "chat",
    description: "Rename or update a conversation",
    hasConditions: false,
  },
  {
    resource: "conversation",
    action: "delete",
    module: "chat",
    description: "Delete a conversation",
    hasConditions: false,
  },
  // ── Conversation members ─────────────────────────────────────────────────────
  {
    resource: "conversation.member",
    action: "read",
    module: "chat",
    description: "List members of a conversation",
    hasConditions: false,
  },
  {
    resource: "conversation.member",
    action: "add",
    module: "chat",
    description: "Add a member to a conversation",
    hasConditions: false,
  },
  {
    resource: "conversation.member",
    action: "remove",
    module: "chat",
    description: "Remove a member from a conversation",
    hasConditions: false,
  },
  // ── Messages ────────────────────────────────────────────────────────────────
  {
    resource: "message",
    action: "create",
    module: "chat",
    description: "Send a message",
    hasConditions: false,
  },
  {
    resource: "message",
    action: "read",
    module: "chat",
    description: "Read messages in a channel or conversation",
    hasConditions: false,
  },
  {
    resource: "message",
    action: "update",
    module: "chat",
    description: "Edit a message (own messages only)",
    hasConditions: true, // createdBy condition
  },
  {
    resource: "message",
    action: "delete",
    module: "chat",
    description: "Delete a message (own + admin override)",
    hasConditions: true, // createdBy condition
  },
  // ── Threads ─────────────────────────────────────────────────────────────────
  {
    resource: "thread",
    action: "create",
    module: "chat",
    description: "Start a reply thread on a message",
    hasConditions: false,
  },
  {
    resource: "thread",
    action: "read",
    module: "chat",
    description: "Read thread messages",
    hasConditions: false,
  },
  {
    resource: "thread",
    action: "close",
    module: "chat",
    description: "Close or reopen a thread",
    hasConditions: false,
  },
  {
    resource: "thread",
    action: "delete",
    module: "chat",
    description: "Delete a thread entirely",
    hasConditions: false,
  },
] as const;
