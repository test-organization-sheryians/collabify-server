export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    createVaultFolder(input: CreateVaultFolderInput!): CreateFolderResult!
  }

  input CreateVaultFolderInput {
    projectId: ID!
    "null = create at root level (Home)"
    parentFolderId: ID
    name: String!
  }

  type CreateFolderResult {
    folder: VaultFolder!
  }
`;
