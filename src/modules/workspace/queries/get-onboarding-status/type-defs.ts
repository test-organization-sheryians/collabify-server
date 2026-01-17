export const getOnboardingStatusTypeDefs = `
  type OnboardingStatus {
    hasUser: Boolean!
    hasWorkspace: Boolean!
    hasProject: Boolean!
    workspaceSlug: String
  }

  extend type Query {
    onboardingStatus: OnboardingStatus!
  }
`;
