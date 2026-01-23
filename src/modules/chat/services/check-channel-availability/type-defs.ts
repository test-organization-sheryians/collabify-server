export const typeDefs = /* GraphQL */ `
  input CheckChannelAvailabilityInput {
    projectId: ID!
    slug: String!
  }

  type ChannelAvailabilityResponse {
    available: Boolean!
    message: String
    reason: String
    reservationId: String
  }

  extend type Mutation {
    checkChannelAvailability(
      input: CheckChannelAvailabilityInput!
    ): ChannelAvailabilityResponse!
  }
`;
