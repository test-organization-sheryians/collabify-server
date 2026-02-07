// Public API for Workspace Module

// 1. GraphQL Interface (for Root Schema Merge)
export { typeDefs as workspaceTypeDefs } from "./api/graphql/type-defs";
export { resolvers as workspaceResolvers } from "./api/graphql/resolvers";

// 2. Loaders (for Context)
export { createWorkspaceLoaders, type WorkspaceLoaders } from "./loaders";

// 3. Shared Queries (External Access)
// If other modules need to fetch workspace data programmatically, export handlers here.
// e.g. export { getWorkspaceById } from "./queries/get-params";
