import { typeDefs as serviceTypeDefs } from "../../services";
import { typeDefs as queryTypeDefs } from "../../queries";

export const typeDefs = `
  type ProjectMember {
    id: ID!
    user: User!
    userId: ID!
    role: String
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
    createdAt: String!
    updatedAt: String!
    members: [ProjectMember!]!
  }

  ${serviceTypeDefs}
  ${queryTypeDefs}
`;
