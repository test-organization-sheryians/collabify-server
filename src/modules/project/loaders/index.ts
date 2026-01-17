import { createProjectByIdLoader } from "./project-by-id.loader";
import { createMembersByProjectIdLoader } from "./members-by-project-id.loader";

export const createProjectLoaders = () => ({
  projectById: createProjectByIdLoader(),
  membersByProjectId: createMembersByProjectIdLoader(),
});

export type ProjectLoaders = ReturnType<typeof createProjectLoaders>;
