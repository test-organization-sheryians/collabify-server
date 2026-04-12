import { z } from "zod";

// =============================================================================
// Notification Event Map — Single Source of Truth
//
// Maps every event type string → its canonical Zod PayloadSchema.
// Schemas are imported from each event's definition.ts — NOT redefined here.
//
// Rules:
//  - One entry per event. Key MUST match EventDefinition.type exactly.
//  - Adding an event: add to map + create definition.ts + handler.ts.
//  - Removing from map = immediate compile error at all emit() call sites.
//  - Never use string literals for event types outside this file.
// =============================================================================

// ── Chat ──────────────────────────────────────────────────────────────────────
import { PayloadSchema as ChatChannelMemberAddedPayloadSchema }   from "./chat/chat.channel.member.added/definition";
import { PayloadSchema as ChatChannelMemberRemovedPayloadSchema }  from "./chat/chat.channel.member.removed/definition";
import { PayloadSchema as ChatDmCreatedPayloadSchema }             from "./chat/chat.dm.created/definition";
import { PayloadSchema as ChatGroupMemberAddedPayloadSchema }      from "./chat/chat.group.member.added/definition";
import { PayloadSchema as ChatMessageMentionPayloadSchema }        from "./chat/chat.message.mention/definition";
import { PayloadSchema as ChatMessageNewPayloadSchema }            from "./chat/chat.message.new/definition";
import { PayloadSchema as ChatMessageReplyPayloadSchema }          from "./chat/chat.message.reply/definition";
import { PayloadSchema as ChatReactionAddedPayloadSchema }         from "./chat/chat.reaction.added/definition";
import { PayloadSchema as ChatThreadCreatedPayloadSchema }         from "./chat/chat.thread.created/definition";
import { PayloadSchema as ChatThreadReplyPayloadSchema }           from "./chat/chat.thread.reply/definition";

// ── Issues ────────────────────────────────────────────────────────────────────
import { PayloadSchema as IssueAssignedPayloadSchema }          from "./issues/issue.assigned/definition";
import { PayloadSchema as IssueCreatedPayloadSchema }           from "./issues/issue.created/definition";
import { PayloadSchema as IssueDeletedPayloadSchema }           from "./issues/issue.deleted/definition";
import { PayloadSchema as IssueDueDatePayloadSchema }           from "./issues/issue.due_date.approaching/definition";
import { PayloadSchema as IssueMentionPayloadSchema }           from "./issues/issue.mention/definition";
import { PayloadSchema as IssueOverduePayloadSchema }           from "./issues/issue.overdue/definition";
import { PayloadSchema as IssuePriorityChangedPayloadSchema }   from "./issues/issue.priority.changed/definition";
import { PayloadSchema as IssueStatusChangedPayloadSchema }     from "./issues/issue.status.changed/definition";
import { PayloadSchema as IssueUnassignedPayloadSchema }        from "./issues/issue.unassigned/definition";

// ── Pages ─────────────────────────────────────────────────────────────────────
import { PayloadSchema as PageArchivedPayloadSchema }              from "./pages/page.archived/definition";
import { PayloadSchema as PageCollaboratorAddedPayloadSchema }     from "./pages/page.collaborator.added/definition";
import { PayloadSchema as PageCollaboratorRemovedPayloadSchema }   from "./pages/page.collaborator.removed/definition";
import { PayloadSchema as PageDeletedPayloadSchema }               from "./pages/page.deleted/definition";
import { PayloadSchema as PageLockedPayloadSchema }                from "./pages/page.locked/definition";
import { PayloadSchema as PageMentionPayloadSchema }               from "./pages/page.mention/definition";

// ── Project ───────────────────────────────────────────────────────────────────
import { PayloadSchema as ProjectArchivedPayloadSchema }          from "./project/project.archived/definition";
import { PayloadSchema as ProjectMemberAddedPayloadSchema }       from "./project/project.member.added/definition";
import { PayloadSchema as ProjectMemberRemovedPayloadSchema }     from "./project/project.member.removed/definition";
import { PayloadSchema as ProjectMemberRoleChangedPayloadSchema } from "./project/project.member.role_changed/definition";
import { PayloadSchema as ProjectUnarchivedPayloadSchema }        from "./project/project.unarchived/definition";

// ── System ────────────────────────────────────────────────────────────────────
import { PayloadSchema as SystemPlanLimitPayloadSchema }              from "./system/system.plan.limit/definition";
import { PayloadSchema as SystemSubscriptionExpiringPayloadSchema }   from "./system/system.subscription.expiring/definition";
import { PayloadSchema as UserWelcomePayloadSchema }                  from "./system/user.welcome/definition";

// ── Vault ─────────────────────────────────────────────────────────────────────
import { PayloadSchema as VaultStorageLimitPayloadSchema }  from "./vault/vault.storage.limit/definition";

// ── Whiteboard ────────────────────────────────────────────────────────────────
import { PayloadSchema as WhiteboardArchivedPayloadSchema }             from "./whiteboard/whiteboard.archived/definition";
import { PayloadSchema as WhiteboardCollaboratorAddedPayloadSchema }    from "./whiteboard/whiteboard.collaborator.added/definition";
import { PayloadSchema as WhiteboardCollaboratorRemovedPayloadSchema }  from "./whiteboard/whiteboard.collaborator.removed/definition";
import { PayloadSchema as WhiteboardLockedPayloadSchema }               from "./whiteboard/whiteboard.locked/definition";

// ── Workspace ─────────────────────────────────────────────────────────────────
import { PayloadSchema as WorkspaceInviteAcceptedPayloadSchema }     from "./workspace/workspace.invite.accepted/definition";
import { PayloadSchema as WorkspaceInviteResentPayloadSchema }       from "./workspace/workspace.invite.resent/definition";
import { PayloadSchema as WorkspaceInviteSentPayloadSchema }         from "./workspace/workspace.invite.sent/definition";
import { PayloadSchema as WorkspaceMemberJoinedPayloadSchema }       from "./workspace/workspace.member.joined/definition";
import { PayloadSchema as WorkspaceMemberRemovedPayloadSchema }      from "./workspace/workspace.member.removed/definition";
import { PayloadSchema as WorkspaceMemberRoleChangedPayloadSchema }  from "./workspace/workspace.member.role_changed/definition";
import { PayloadSchema as WorkspaceOwnershipTransferredPayloadSchema } from "./workspace/workspace.ownership.transferred/definition";

// =============================================================================
// THE MAP
// key   = EventDefinition.type (exact match required)
// value = Zod schema for that event's payload
// =============================================================================
export const EVENT_MAP = {
  // ── Chat ──────────────────────────────────────────────────────────────────
  "chat.channel.member.added":   ChatChannelMemberAddedPayloadSchema,
  "chat.channel.member.removed": ChatChannelMemberRemovedPayloadSchema,
  "chat.dm.created":             ChatDmCreatedPayloadSchema,
  "chat.group.member.added":     ChatGroupMemberAddedPayloadSchema,
  "chat.message.mention":        ChatMessageMentionPayloadSchema,
  "chat.message.new":            ChatMessageNewPayloadSchema,
  "chat.message.reply":          ChatMessageReplyPayloadSchema,
  "chat.reaction.added":         ChatReactionAddedPayloadSchema,
  "chat.thread.created":         ChatThreadCreatedPayloadSchema,
  "chat.thread.reply":           ChatThreadReplyPayloadSchema,

  // ── Issues ────────────────────────────────────────────────────────────────
  "issue.assigned":              IssueAssignedPayloadSchema,
  "issue.created":               IssueCreatedPayloadSchema,
  "issue.deleted":               IssueDeletedPayloadSchema,
  "issue.due_date.approaching":  IssueDueDatePayloadSchema,
  "issue.mention":               IssueMentionPayloadSchema,
  "issue.overdue":               IssueOverduePayloadSchema,
  "issue.priority.changed":      IssuePriorityChangedPayloadSchema,
  "issue.status.changed":        IssueStatusChangedPayloadSchema,
  "issue.unassigned":            IssueUnassignedPayloadSchema,

  // ── Pages ─────────────────────────────────────────────────────────────────
  "page.archived":               PageArchivedPayloadSchema,
  "page.collaborator.added":     PageCollaboratorAddedPayloadSchema,
  "page.collaborator.removed":   PageCollaboratorRemovedPayloadSchema,
  "page.deleted":                PageDeletedPayloadSchema,
  "page.locked":                 PageLockedPayloadSchema,
  "page.mention":                PageMentionPayloadSchema,

  // ── Project ───────────────────────────────────────────────────────────────
  "project.archived":            ProjectArchivedPayloadSchema,
  "project.member.added":        ProjectMemberAddedPayloadSchema,
  "project.member.removed":      ProjectMemberRemovedPayloadSchema,
  "project.member.role_changed": ProjectMemberRoleChangedPayloadSchema,
  "project.unarchived":          ProjectUnarchivedPayloadSchema,

  // ── System ────────────────────────────────────────────────────────────────
  "system.plan.limit":               SystemPlanLimitPayloadSchema,
  "system.subscription.expiring":    SystemSubscriptionExpiringPayloadSchema,
  "user.welcome":                    UserWelcomePayloadSchema,

  // ── Vault ─────────────────────────────────────────────────────────────────
  "vault.storage.limit":         VaultStorageLimitPayloadSchema,

  // ── Whiteboard ────────────────────────────────────────────────────────────
  "whiteboard.archived":              WhiteboardArchivedPayloadSchema,
  "whiteboard.collaborator.added":    WhiteboardCollaboratorAddedPayloadSchema,
  "whiteboard.collaborator.removed":  WhiteboardCollaboratorRemovedPayloadSchema,
  "whiteboard.locked":                WhiteboardLockedPayloadSchema,

  // ── Workspace ─────────────────────────────────────────────────────────────
  "workspace.invite.accepted":        WorkspaceInviteAcceptedPayloadSchema,
  "workspace.invite.resent":          WorkspaceInviteResentPayloadSchema,
  "workspace.invite.sent":            WorkspaceInviteSentPayloadSchema,
  "workspace.member.joined":          WorkspaceMemberJoinedPayloadSchema,
  "workspace.member.removed":         WorkspaceMemberRemovedPayloadSchema,
  "workspace.member.role_changed":    WorkspaceMemberRoleChangedPayloadSchema,
  "workspace.ownership.transferred":  WorkspaceOwnershipTransferredPayloadSchema,
} as const satisfies Record<string, z.ZodTypeAny>;

// =============================================================================
// Derived Types — everything downstream uses these, never raw strings
// =============================================================================

/** All valid event type strings. Using an unlisted string is a compile error. */
export type EventType = keyof typeof EVENT_MAP;

/**
 * Strongly typed payload for a given event.
 *
 * @example
 * const payload: EventPayload<"chat.channel.member.added"> = { ... };
 */
export type EventPayload<T extends EventType> = z.infer<(typeof EVENT_MAP)[T]>;

/**
 * Discriminated union of ALL possible typed outbox events.
 * This is what emit() accepts — wrong type or payload shape = compile error.
 *
 * @example
 * const event: TypedOutboxEvent = {
 *   type: "chat.channel.member.added",
 *   payload: { conversationId: "...", ... },
 * };
 */
export type TypedOutboxEvent = {
  [K in EventType]: {
    type: K;
    payload: EventPayload<K>;
    deduplicationId?: string;
  };
}[EventType];

/**
 * Type guard: is this runtime string a registered EventType?
 * Use in Decider / switch statements to narrow unknown string → EventType.
 */
export function isKnownEventType(type: string): type is EventType {
  return type in EVENT_MAP;
}
