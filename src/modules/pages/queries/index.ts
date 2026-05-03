/**
 * Queries barrel — re-exports all query handlers for use in resolvers.ts
 *
 * USAGE in resolvers.ts:
 *   import * as queries from '../queries'
 *   queries.getPage.handler(input, ctx)
 *   queries.getPageSnapshot.schema.parse(args)
 */

export * as getPage from "./get-page";
export * as getPageSnapshot from "./get-page-snapshot";
export * as getProjectPages from "./get-project-pages";
export * as getPageCollaborators from "./get-page-collaborators";
export * as getActivePageCollaborators from "./get-active-page-collaborators";
export * as getPagesHome from "./get-pages-home";
