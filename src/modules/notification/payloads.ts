import { z } from "zod";

// -----------------------------------------------------------------------------
// 1. Base Schema (Common fields for all events)
// -----------------------------------------------------------------------------
const BaseEventSchema = z.object({
  // Actor who triggered the event (optional, sometimes system)
  actorId: z.string().optional(),

  // Tenant Context (Optional but recommended for multi-tenancy)
  tenantId: z.string().optional(),
});

// -----------------------------------------------------------------------------
// 2. Specific Event Schemas (IMPLEMENTING "FAT PAYLOAD" PATTERN)
// -----------------------------------------------------------------------------

/**
 * Workspace Invite
 * Fat Payload: Includes Name, Inviter Name, and the Action URL.
 */
export const WorkspaceInviteSchema = BaseEventSchema.extend({
  workspaceId: z.string().min(1),
  workspaceName: z.string().min(1),
  inviterName: z.string().min(1),
  // The actionable link (Pre-computed by Producer)
  inviteUrl: z.string().url(),
});

/**
 * Task Assigned
 * Fat Payload: Includes Task Title, Project Name, and Deep Link.
 */
export const TaskAssignedSchema = BaseEventSchema.extend({
  taskId: z.string().min(1),
  taskTitle: z.string().min(1),
  taskNumber: z.number().int(),

  projectId: z.string().min(1),
  projectKey: z.string().min(1), // e.g. "PROJ-123"
  projectName: z.string().min(1),

  assigneeId: z.string().min(1),
  assignerName: z.string().min(1),

  // Action Link
  taskUrl: z.string().url(),
});

/**
 * Chat Message (New)
 * Fat Payload: Includes Excerpt and Sender Name.
 */
export const ChatMessageNewSchema = BaseEventSchema.extend({
  channelId: z.string().min(1),
  channelName: z.string().min(1),

  messageId: z.string().min(1),
  contentExcerpt: z.string().max(200), // Truncated for push/email

  senderName: z.string().min(1),
  senderAvatarUrl: z.string().optional(),

  // Deep Link
  messageUrl: z.string().url(),
});

/**
 * Welcome User (Phase 13)
 * Fat Payload: Simple, just needs user details.
 */
export const WelcomeUserSchema = BaseEventSchema.extend({
  userId: z.string().min(1),
  userEmail: z.string().email(),
  userName: z.string().min(1),
});

/**
 * Workspace Created (Producer Wiring)
 */
export const WorkspaceCreatedSchema = BaseEventSchema.extend({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  ownerId: z.string().min(1),
});

// -----------------------------------------------------------------------------
// 3. The Master Registry Map
// -----------------------------------------------------------------------------
export const EventSchemas = {
  "workspace.invite": WorkspaceInviteSchema,
  "task.assigned": TaskAssignedSchema,
  "chat.message.new": ChatMessageNewSchema,
  "welcome.user": WelcomeUserSchema,
  "workspace.created": WorkspaceCreatedSchema,
} as const;

// -----------------------------------------------------------------------------
// 4. Derived Types (Discriminated Union)
// -----------------------------------------------------------------------------
export type EventType = keyof typeof EventSchemas;

// Helper to extract the Zod Type for a given key
export type Payload<T extends EventType> = z.infer<(typeof EventSchemas)[T]>;

// The Discriminated Union of ALL possible payloads
// { type: 'workspace.invite', ...payload } | { type: 'task.assigned', ...payload }
export type NotificationPayload = {
  [K in EventType]: { type: K } & Payload<K>;
}[EventType];
