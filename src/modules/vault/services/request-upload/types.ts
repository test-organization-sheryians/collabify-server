import type { VaultFile } from "@prisma/client";

/** Minimal VaultFile shape returned by createPendingFile step. */
export type PendingFileRow = VaultFile;

/** Handler return type — presigned URL + fileId for the client. */
export interface RequestUploadResult {
  fileId: string;
  presignedUrl: string;
  expiresAt: Date;
}
