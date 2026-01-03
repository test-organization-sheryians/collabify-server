export const typeDefs = `
  type Workspace {
    id: ID!
    slug: String!
    name: String!
    logoUrl: String
    createdAt: String!
    updatedAt: String!
    # Add other fields as needed
  }

  type OnboardingStatus {
    hasUser: Boolean!
    hasWorkspace: Boolean!
    hasProject: Boolean!
    workspaceSlug: String
  }

  extend type Query {
    myWorkspaces: [Workspace!]!
    onboardingStatus: OnboardingStatus!
  }

  extend type Mutation {
    createOnboardingWorkspace: Workspace!
  }
`;
