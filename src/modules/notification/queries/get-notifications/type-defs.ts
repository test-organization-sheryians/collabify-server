export const getNotificationsTypeDefs = `
  extend type Query {
    """
    Get paginated notifications for the current user.
    """
    notifications(
      limit: Int
      cursor: String
      isRead: Boolean
    ): NotificationConnection!
  }

  type NotificationConnection {
    edges: [NotificationEdge!]!
    pageInfo: PageInfo!
  }

  type NotificationEdge {
    node: Notification!
    cursor: String!
  }

  type Notification {
    id: ID!
    recipientUserId: String!
    actorId: String
    entityType: String!
    entityId: String!
    category: String!
    data: JSON
    isRead: Boolean!
    isArchived: Boolean!
    createdAt: DateTime!

    # Resolved fields (Polymorphic)
    actor: User
    chatMessage: ChatMessage
    workspace: Workspace
    project: Project
    task: Task
    page: Page
  }

  # Polymorphic types (Partial defs needed if not global)
  type Task {
    id: ID!
    title: String!
    statusName: String!
  }

  type Page {
    id: ID!
    title: String!
  }


`;
