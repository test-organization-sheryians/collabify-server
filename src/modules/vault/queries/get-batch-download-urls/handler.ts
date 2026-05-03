/**
 * getBatchDownloadUrls — Query Handler
 *
 * Given a list of fileIds, returns a presigned GET URL for each one.
 * Returns per-file status so clients can render tombstones for DELETED files
 * without failing the entire batch.
 *
 * Status per file:
 *   "ACTIVE"    — URL generated, ready to use (1h expiry)
 *   "DELETED"   — file was deleted from Vault; render tombstone
 *   "PENDING"   — upload not confirmed yet; render placeholder
 *   "FORBIDDEN" — caller is not a member of this file's project
 *
 * Max batch size: 50 fileIds. Validated in schema.ts.
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetBatchDownloadUrlsInput } from "./schema";
import { env } from "@/shared/config/env";

const logger = createLogger("vault:queries:get-batch-download-urls");

export interface BatchDownloadUrlResult {
  fileId: string;
  url: string | null;
  status: "ACTIVE" | "DELETED" | "PENDING" | "FORBIDDEN";
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export const getBatchDownloadUrlsHandler = async (
  input: GetBatchDownloadUrlsInput,
  ctx: ServiceContext
): Promise<BatchDownloadUrlResult[]> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate) throw AppError.unauthorized();

  logger.debug("getBatchDownloadUrls started", {
    userId,
    count: input.fileIds.length,
  });

  // Single IN(...) query — O(1) DB hit regardless of batch size
  const files = await ctx.db.vaultFile.findMany({
    where: { id: { in: input.fileIds } },
    select: {
      id: true,
      projectId: true,
      s3Key: true,
      status: true,
      name: true,
      mimeType: true,
      sizeBytes: true,
    },
  });

  // Build a lookup map for O(1) file access per fileId
  const fileMap = new Map(files.map((f) => [f.id, f]));

  // Resolve membership once per unique projectId in the batch
  const projectIds = [...new Set(files.map((f) => f.projectId))];
  const membershipCache = new Map<string, boolean>();

  await Promise.all(
    projectIds.map(async (projectId) => {
      try {
        await ctx.authGate!.assertProjectMember(projectId);
        membershipCache.set(projectId, true);
      } catch {
        membershipCache.set(projectId, false);
      }
    })
  );

  // Process each fileId in the original order
  const results: BatchDownloadUrlResult[] = await Promise.all(
    input.fileIds.map(async (fileId): Promise<BatchDownloadUrlResult> => {
      const file = fileMap.get(fileId);

      // File not found (may have been purged from DB)
      if (!file) {
        return {
          fileId,
          url: null,
          status: "DELETED",
          name: "Unknown",
          mimeType: "application/octet-stream",
          sizeBytes: 0,
        };
      }

      // RBAC — check project membership
      if (!membershipCache.get(file.projectId)) {
        return {
          fileId,
          url: null,
          status: "FORBIDDEN",
          name: file.name,
          mimeType: file.mimeType,
          sizeBytes: Number(file.sizeBytes),
        };
      }

      // Non-ACTIVE files return status without a URL
      if (file.status !== "ACTIVE") {
        return {
          fileId,
          url: null,
          status: file.status as "DELETED" | "PENDING",
          name: file.name,
          mimeType: file.mimeType,
          sizeBytes: Number(file.sizeBytes),
        };
      }

      // Build permanent proxy URL — no AWS SDK call, no expiry
      const url = `${env.API_URL}/vault/file/${fileId}`;
      return {
        fileId,
        url,
        status: "ACTIVE",
        name: file.name,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
      };
    })
  );

  logger.debug("getBatchDownloadUrls done", {
    total: input.fileIds.length,
    active: results.filter((r) => r.status === "ACTIVE").length,
    deleted: results.filter((r) => r.status === "DELETED").length,
    forbidden: results.filter((r) => r.status === "FORBIDDEN").length,
  });

  return results;
};
