// =============================================================================
// Notification Management API — GraphQL Type Definitions (Phase 6.1)
//
// Covers 8 GQL operations:
//   Queries:   notifications, unreadNotificationCount
//   Mutations: markNotificationRead, markAllNotificationsRead
// =============================================================================

export const notificationManagementTypeDefs = /* GraphQL */ `

  # ── Enums ────────────────────────────────────────────────────────────────

  enum NotificationCategory {
    chat_messages
    mentions
    reactions
    assignments
    deadlines
    access_changes
    collaboration
    system_admin
  }

  enum ConversationNotifMode {
    ALL_MESSAGES
    MENTIONS_ONLY
    NOTHING
  }

  enum GlobalNotifMode {
    ALL
    MENTIONS_ONLY
    NOTHING
  }

  # ── Core Notification Type ────────────────────────────────────────────────

  type Notification {
    id:              ID!
    recipientUserId: String!
    actorId:         String
    entityType:      String!
    entityId:        String!
    category:        String!
    data:            JSON!
    isRead:          Boolean!
    isArchived:      Boolean!
    createdAt:       DateTime!
    workspaceId:     String
    projectId:       String

    # Field resolvers (via DataLoaders)
    actor:     User
    workspace: Workspace
    project:   Project
  }

  type NotificationEdge {
    cursor: String!
    node:   Notification!
  }

  type NotificationConnection {
    edges:    [NotificationEdge!]!
    pageInfo: PageInfo!
  }

  # ── Preference Shared Types ───────────────────────────────────────────────
  # These are used by user, workspace, project, and chat modules.

  type CategoryPreferenceSetting {
    category:    NotificationCategory!
    email:       Boolean!
    push:        Boolean!
    inApp:       Boolean!
  }

  type GlobalNotificationPreference {
    emailEnabled: Boolean!
    pushEnabled:  Boolean!
    inAppEnabled: Boolean!
    globalMode:   GlobalNotifMode!
    categories:   [CategoryPreferenceSetting!]!
  }

  type ScopedNotificationPreference {
    emailEnabled: Boolean
    pushEnabled:  Boolean
    categories:   [CategoryPreferenceSetting!]!
  }

  type ConversationNotificationPreference {
    conversationId: String!
    mode:           ConversationNotifMode!
    muteUntil:      DateTime
    pushEnabled:    Boolean
    emailEnabled:   Boolean
  }

  # ── Inputs ────────────────────────────────────────────────────────────────

  input CategoryPreferenceInput {
    category: NotificationCategory!
    email:    Boolean!
    push:     Boolean!
    inApp:    Boolean!
  }

  input UpdateScopedPreferencesInput {
    emailEnabled: Boolean
    pushEnabled:  Boolean
    categories:   [CategoryPreferenceInput!]
  }

  # ── Queries ───────────────────────────────────────────────────────────────

  extend type Query {
    notifications(
      limit:  Int
      cursor: String
      isRead: Boolean
    ): NotificationConnection!

    unreadNotificationCount: Int!
  }

  # ── Mutations ─────────────────────────────────────────────────────────────

  extend type Mutation {
    markNotificationRead(ids: [ID!]!): Boolean!

    markAllNotificationsRead: Boolean!
  }
`;
