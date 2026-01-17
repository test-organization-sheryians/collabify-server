import { createWorkspaceByIdLoader } from "./workspace-by-id.loader";

export const createWorkspaceLoaders = () => ({
  workspaceById: createWorkspaceByIdLoader(),
});

export type WorkspaceLoaders = ReturnType<typeof createWorkspaceLoaders>;
