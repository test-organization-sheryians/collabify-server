import type { VaultFile } from "@prisma/client";

/**
 * Minimal VaultFile fields needed by the delete handler steps.
 * Only fields actually used downstream are selected.
 */
export type ActiveFileForDelete = Pick<
  VaultFile,
  "id" | "projectId" | "workspaceId" | "sizeBytes"
>;

/** Handler return type. */
export interface DeleteFileResult {
  success: true;
  id: string;
}
