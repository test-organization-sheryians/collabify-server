export const checkSlugAvailabilityTypeDefs = `
  type AvailabilityResponse {
    available: Boolean!
    message: String
    reservationId: String
  }

  extend type Mutation {
    checkSlugAvailability(slug: String!): AvailabilityResponse!
  }
`;
