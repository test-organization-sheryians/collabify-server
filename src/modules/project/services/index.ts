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
