/**
 * Types for get-page query.
 */
import type { Page } from "@prisma/client";

/** Full page record returned to the GraphQL resolver. */
export type GetPageResult = Page;

/**
 * Minimal page row fetched by fetch-page step.
 * Includes all fields used by check-access (workspaceId) and the resolver (all Page fields).
 */
export type PageRow = Page;
