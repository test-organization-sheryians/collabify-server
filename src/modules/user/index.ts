// Public API for User Module

// 1. GraphQL Interface (for Root Schema Merge)
export { typeDefs as userTypeDefs } from "./api/graphql/type-defs";
export { resolvers as userResolvers } from "./api/graphql/resolvers";

// 2. Loaders (for Context)
export { createUserLoaders, type UserLoaders } from "./loaders";

// 3. Shared Exports
export { getMe as findUserById } from "./queries/get-me";
export { syncUser } from "./services/sync-user";
