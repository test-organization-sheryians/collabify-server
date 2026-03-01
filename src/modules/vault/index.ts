/**
 * Vault Module — Public API
 *
 * Exports vaultTypeDefs and vaultResolvers for registration in the server's
 * GraphQL schema builder. Pattern mirrors pages/index.ts.
 *
 * Usage in server/src/graphql/schema.ts (or equivalent):
 *
 *   import { vaultTypeDefs, vaultResolvers } from '@/modules/vault'
 *   // merge into makeExecutableSchema({ typeDefs: [..., vaultTypeDefs] })
 *   // merge vaultResolvers with mergeResolvers(...)
 */

export { vaultTypeDefs } from "./graphql/type-defs";
export { resolvers as vaultResolvers } from "./graphql/resolvers";

/**
 * VaultIntakeService is the entry point for other modules (Chat, Pages, etc.)
 * to upload files that appear in Vault under their respective system folder.
 */
export { registerExternalFile } from "./lib/vault-intake.service";
export type {
  RegisterExternalFileInput,
  RegisterExternalFileResult,
} from "./lib/vault-intake.service";
