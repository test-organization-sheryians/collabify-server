export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    unpinVaultFolder(input: UnpinVaultFolderInput!): DeleteResult!
  }

  input UnpinVaultFolderInput {
    folderId: ID!
  }
`;
