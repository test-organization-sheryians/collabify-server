/**
 * WorkspaceService Aggregator
 *
 * Refactored to adhere to <150 lines per file limit.
 * Delegates logic to sub-modules in ./logic/
 */

import { SlugLogic } from "./logic/slug";
import { creationLogic } from "./logic/creation";
import { RetrievalLogic } from "./logic/retrieval";
import { OnboardingLogic } from "./logic/onboarding";
import { InvitationLogic } from "./logic/invitation";
import { MembersLogic } from "./logic/members";

export const WorkspaceService = {
  ...SlugLogic,
  ...creationLogic,
  ...RetrievalLogic,
  ...OnboardingLogic,
  ...InvitationLogic,
  ...MembersLogic,
};
