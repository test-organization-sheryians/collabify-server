/**
 * Types for archive-page service.
 */
import type { Page } from "@prisma/client";

/** Updated page record returned to the resolver after archiving. */
export type ArchivePageResult = { page: Page };
