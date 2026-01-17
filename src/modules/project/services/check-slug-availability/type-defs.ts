export const typeDefs = `
  type AvailabilityResponse {
    available: Boolean!
    message: String
    reservationId: String
    reason: String
  }

  extend type Mutation {
    checkProjectSlugAvailability(workspaceId: ID!, slug: String!): AvailabilityResponse!
  }
`;
