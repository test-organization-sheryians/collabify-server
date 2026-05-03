/**
 * Mention Module — Public API
 *
 * Usage in server/src/graphql/schema.ts:
 *   import { mentionTypeDefs, mentionResolvers } from '@/modules/mention';
 *   // spread mentionTypeDefs into typeDefs array
 *   // include mentionResolvers in resolvers array
 */
export { mentionTypeDefs } from "./graphql/type-defs";
export { resolvers as mentionResolvers } from "./graphql/resolvers";
