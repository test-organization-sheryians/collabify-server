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

  type AvailabilityResponse {
    available: Boolean!
    message: String
    reservationId: String
    reason: String
  }

  input CreateProjectInput {
    name: String!
    slug: String # Optional, auto-generated if missing
    description: String
  }

  extend type Query {
    myProjects(workspaceId: ID!): [Project!]!
    project(id: ID!): Project
    projectBySlug(workspaceId: ID!, slug: String!): Project
  }

  extend type Mutation {
    checkProjectSlugAvailability(workspaceId: ID!, slug: String!): AvailabilityResponse!
    createProject(workspaceId: ID!, input: CreateProjectInput!): Project!
  }

`;
