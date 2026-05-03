export const typeDefs = /* GraphQL */ `
  input MarkFilesUnreferencedInput {
    "File IDs that are no longer present in the saved document content."
    fileIds: [ID!]!
    "The entity (page or issue) whose save triggered this mark."
    entityId: ID!
    "The entity type — PAGE or TASK."
    entityType: VaultFileSource!
  }

  type MarkFilesUnreferencedResult {
    "Number of files successfully marked unreferenced."
    markedCount: Int!
  }

  extend type Mutation {
    """
    Called by the editor on save when one or more vault://fileId references
    have been removed from the document content since the last save.

    Does NOT delete files immediately — sets unrefAt for the cleanup job to
    process after a grace period (default 30 min), preserving in-session undo.
    """
    markFilesUnreferenced(input: MarkFilesUnreferencedInput!): MarkFilesUnreferencedResult!
  }
`
