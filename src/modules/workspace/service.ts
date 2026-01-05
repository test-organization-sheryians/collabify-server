/**
 * WorkspaceService Aggregator
 *
 * Refactored to adhere to <150 lines per file limit.
 * Delegates logic to sub-modules in ./logic/
 */

import { SlugLogic } from "./logic/slug.logic";
import { CreationLogic } from "./logic/creation.logic";
import { RetrievalLogic } from "./logic/retrieval.logic";
import { OnboardingLogic } from "./logic/onboarding.logic";

export const WorkspaceService = {
  ...SlugLogic,
  ...CreationLogic,
  ...RetrievalLogic,
  ...OnboardingLogic,
};
