/**
 * Loaders index — DataLoader factory for the Pages module.
 *
 * Called once per GraphQL request in graphql/context.ts:
 *   dataloaders: { page: createPageLoaders(), ... }
 *
 * Each loader instance has its own in-request cache (default DataLoader behaviour).
 * This means repeated reads of the same key within one request are deduped
 * but caches do NOT leak between requests.
 */

import { createUserByIdLoader } from "./page-by-id-loader";
import { createCollaboratorsByPageIdLoader } from "./collaborators-by-page-id-loader";

/**
 * Factory — creates fresh DataLoader instances for a single GraphQL request.
 *
 * TODO: call when both loaders are implemented
 */
export const createPageLoaders = () => ({
  /** Page.creator field resolver: userId → PrismaUser | null */
  userById: createUserByIdLoader(),
  /** Page.collaborators field resolver: pageId → PrismaPageCollaborator[] */
  collaboratorsByPageId: createCollaboratorsByPageIdLoader(),
});

/** Type alias for the ApplicationContext dataloaders.page field */
export type PageLoaders = ReturnType<typeof createPageLoaders>;
