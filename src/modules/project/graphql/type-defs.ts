import { typeDefs as serviceTypeDefs } from "../services";
import { typeDefs as queryTypeDefs } from "../queries";

export const typeDefs = `
  type ProjectMember {
    id: ID!
    user: User!
    userId: ID!
    role: String
    roleId: ID
    joinedAt: String!
  }

  type Project {
    id: ID!
    workspaceId: String!
    key: String!
    name: String!
    description: String
    isPrivate: Boolean
    isArchived: Boolean
    logoS3Key: String
    logoUrl: String
    createdAt: String!
    updatedAt: String!
    members: [ProjectMember!]!
    activePlugins: [String!]!
  }

  type ProjectRole {
    id: ID!
    projectId: ID
    workspaceId: ID!
    name: String!
    description: String
    scopeType: String!
    isSystem: Boolean!
    rank: Int!
    createdAt: String!
    updatedAt: String!
  }

  ${serviceTypeDefs}
  ${queryTypeDefs}
`;
