import { getActiveContextTypeDefs } from "../queries/get-active-context";
import { getFeatureFlagsTypeDefs } from "../queries/get-feature-flags";
import { toggleFeatureFlagTypeDefs } from "../services/toggle-feature-flag";

export const typeDefs = /* GraphQL */ `
  ${getActiveContextTypeDefs}
  ${getFeatureFlagsTypeDefs}
  ${toggleFeatureFlagTypeDefs}
`;
