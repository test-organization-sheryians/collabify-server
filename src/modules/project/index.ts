// Public API for Project Module

// 1. GraphQL Interface
export { typeDefs as projectTypeDefs } from "./api/graphql/type-defs";
export { resolvers as projectResolvers } from "./api/graphql/resolvers";

// 2. Loaders
export { createProjectLoaders, type ProjectLoaders } from "./loaders";
