/**
 * Issues Module — Public API
 *
 * Usage in server/src/graphql/schema.ts:
 *   import { issuesTypeDefs, issuesResolvers } from '@/modules/issues';
 *   // spread issuesTypeDefs into typeDefs array
 *   // include issuesResolvers in resolvers array
 */

export { issuesTypeDefs } from "./graphql/type-defs";
export { resolvers as issuesResolvers } from "./graphql/resolvers";

/**
 * seedDefaultIssueStatuses — call this from the createProject service
 * after the project row is inserted. Inserts the 6 system Kanban columns.
 */
export { seedDefaultIssueStatuses } from "./lib/seed-statuses";
