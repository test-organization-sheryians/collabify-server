// Public API for Project Module

// 1. GraphQL Interface
export { typeDefs as projectTypeDefs } from "./graphql/type-defs";
export { resolvers as projectResolvers } from "./graphql/resolvers";

// 2. Loaders
export { createProjectLoaders, type ProjectLoaders } from "./loaders";
