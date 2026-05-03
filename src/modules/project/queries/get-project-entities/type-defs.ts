export const searchEntityTypeDef = `
  enum SearchEntityType {
    PAGE
    ISSUE
    VAULT_FILE
    VAULT_FOLDER
    WHITEBOARD
    USER
  }

  type SearchEntity {
    id: ID!
    type: SearchEntityType!
    name: String!
  }
`;

export const getProjectEntitiesTypeDefs = `
  type Query {
    getProjectEntities(projectId: ID!): [SearchEntity!]!
  }
`;
