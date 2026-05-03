/**
 * Services barrel — re-exports all service handlers for use in resolvers.ts
 *
 * USAGE in resolvers.ts:
 *   import * as services from '../services'
 *   services.createPage.handler(input, ctx)
 *   services.createPage.schema.parse(args.input)
 */

export * as createPage from "./create-page";
export * as deletePage from "./delete-page";
export * as renamePage from "./rename-page";
export * as archivePage from "./archive-page";
export * as unarchivePage from "./unarchive-page";
export * as lockPage from "./lock-page";
export * as unlockPage from "./unlock-page";
export * as reorderPage from "./reorder-page";
export * as addPageCollaborators from "./add-page-collaborators";
export * as removePageCollaborator from "./remove-page-collaborator";
export * as updatePageDetails from "./update-page-details";
