export const typeDefs = /* GraphQL */ `
  scalar DateTime
  scalar JSON

  type Notification {
    id: ID!
    recipientUserId: String!
    actorId: String

    # Generic Routing
    entityType: String!
    entityId: String!
    category: String!

    # Metadata
    isRead: Boolean!
    isArchived: Boolean!
    createdAt: DateTime!
    data: JSON

    # Relations (Dataloaded)
    actor: User
    workspace: Workspace
    project: Project
    page: Page
    task: Task
    chatMessage: ChatMessage
  }

  type NotificationEdge {
    cursor: String!
    node: Notification!
  }

  type NotificationConnection {
    edges: [NotificationEdge!]!
    pageInfo: PageInfo!
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  extend type Query {
    """
    Get paginated notifications for the current user.
    """
    notifications(
      limit: Int
      cursor: String
      isRead: Boolean
    ): NotificationConnection!

    """
    Get count of unread notifications.
    """
    unreadNotificationCount: Int!
  }

  extend type Mutation {
    """
    Mark specific notifications as read.
    """
    markNotificationRead(ids: [ID!]!): Boolean!

    """
    Mark all notifications as read.
    """
    markAllNotificationsRead: Boolean!
  }

  # --- Stubs for Missing Modules (Temporary) ---
  type Project {
    id: ID!
    name: String!
    key: String!
  }

  type Task {
    id: ID!
    title: String!
    statusName: String!
  }

  type Page {
    id: ID!
    title: String!
  }

  type ChatMessage {
    id: ID!
    content: String!
  }
`;
