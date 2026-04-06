import { CreateProjectTypeDefs } from "./create-project";
import { CheckSlugAvailabilityTypeDefs } from "./check-slug-availability";
import { updateProjectTypeDefs } from "./update-project";
import { addProjectMemberTypeDefs } from "./add-project-member";
import { removeProjectMemberTypeDefs } from "./remove-project-member";
import { updateProjectMemberRoleTypeDefs } from "./update-project-member-role";
import { archiveProjectTypeDefs } from "./archive-project";
import { unarchiveProjectTypeDefs } from "./unarchive-project";
import { deleteProjectTypeDefs } from "./delete-project";
import { leaveProjectTypeDefs } from "./leave-project";
import { createProjectRoleTypeDefs } from "./create-project-role";
import { updateProjectRoleTypeDefs } from "./update-project-role";
import { deleteProjectRoleTypeDefs } from "./delete-project-role";
import { toggleProjectPluginTypeDefs } from "./toggle-project-plugin";
import { requestProjectLogoUploadTypeDefs } from "./request-project-logo-upload";

export const typeDefs = [
  CreateProjectTypeDefs,
  CheckSlugAvailabilityTypeDefs,
  updateProjectTypeDefs,
  addProjectMemberTypeDefs,
  removeProjectMemberTypeDefs,
  updateProjectMemberRoleTypeDefs,
  archiveProjectTypeDefs,
  unarchiveProjectTypeDefs,
  deleteProjectTypeDefs,
  leaveProjectTypeDefs,
  createProjectRoleTypeDefs,
  updateProjectRoleTypeDefs,
  deleteProjectRoleTypeDefs,
  toggleProjectPluginTypeDefs,
  requestProjectLogoUploadTypeDefs,
].join("\n");

export * from "./create-project";
export * from "./check-slug-availability";
export * from "./update-project";
export * from "./add-project-member";
export * from "./remove-project-member";
export * from "./update-project-member-role";
export * from "./archive-project";
export * from "./unarchive-project";
export * from "./delete-project";
export * from "./leave-project";
export * from "./create-project-role";
export * from "./update-project-role";
export * from "./delete-project-role";
export * from "./toggle-project-plugin";
export * from "./request-project-logo-upload";
