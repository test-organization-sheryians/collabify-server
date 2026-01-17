import { creationLogic } from "./logic/creation";
import { membersLogic } from "./logic/members";
import { slugLogic } from "./logic/slug";
import { retrievalLogic } from "./logic/retrieval";

export const ProjectService = {
  ...creationLogic,
  ...membersLogic,
  ...slugLogic,
  ...retrievalLogic,
};
