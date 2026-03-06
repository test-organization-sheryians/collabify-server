/**
 * Types for lock-page service.
 */
import type { Page } from "@prisma/client";

export interface LockPageResult {
  page: Page;
}
