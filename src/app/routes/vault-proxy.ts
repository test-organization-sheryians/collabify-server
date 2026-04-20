/**
 * vault-proxy.ts — Authenticated S3 File Proxy
 *
 * GET /vault/file/:fileId
 *
 * Streams a vault file directly from S3 to the browser. This is the read
 * counterpart to the presigned PUT upload flow.
 *
 * Why REST (not GraphQL):
 *   GraphQL returns JSON — binary streaming is impossible through it.
 *   Browsers load <img src="...">, <video src="...">, etc. via plain GET.
 *   HTTP Range requests for video seeking require standard HTTP headers.
 *
 * Auth:
 *   Clerk session via clerkMiddleware() (already registered globally).
 *   getAuth(c) extracts userId. Route returns 401 if unauthenticated.
 *
 * Security:
 *   - File must be ACTIVE (not PENDING/DELETED)
 *   - Caller must be a project member (same gate as GraphQL queries)
 *   - S3 bucket remains private — no public bucket policy needed
 *
 * Caching:
 *   Cache-Control: private, max-age=3600 — browser caches for 1 hour.
 *   ETag: fileId — enables conditional requests (304 Not Modified).
 *   Files are immutable once confirmed — content never changes for a given fileId.
 */

import { Hono } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/infra/db";
import { redis } from "@/infra/redis";
import { s3Client } from "@/infra/aws/s3";
import { env } from "@/shared/config/env";
import { createGraphQLAuthContext } from "@/modules/authorization";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("vault:proxy");
const BUCKET = env.S3_VAULT_BUCKET;

export const vaultProxyRoutes = new Hono();

vaultProxyRoutes.get("/vault/file/:fileId", async (c) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = getAuth(c);
  const userId = auth?.userId ?? null;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { fileId } = c.req.param();

  if (!fileId || typeof fileId !== "string") {
    return c.json({ error: "Missing fileId" }, 400);
  }

  // ── DB lookup ─────────────────────────────────────────────────────────────
  const file = await db.vaultFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      projectId: true,
      s3Key: true,
      status: true,
      mimeType: true,
      name: true,
    },
  });

  if (!file) {
    return c.json({ error: "Not found" }, 404);
  }

  if (file.status === "DELETED") {
    return c.json({ error: "File has been deleted" }, 410);
  }

  if (file.status !== "ACTIVE") {
    // PENDING — upload not yet confirmed
    return c.json({ error: "File is not yet available" }, 202);
  }

  // ── Authorization (project membership) ───────────────────────────────────
  const { auth: authGate } = createGraphQLAuthContext(userId, db, redis);
  try {
    await authGate.assertProjectMember(file.projectId);
  } catch {
    return c.json({ error: "Forbidden" }, 403);
  }

  // ── Check conditional request (ETag) ──────────────────────────────────────
  const ifNoneMatch = c.req.header("If-None-Match");
  if (ifNoneMatch === `"${fileId}"`) {
    return new Response(null, { status: 304 });
  }

  // ── Stream from S3 ────────────────────────────────────────────────────────
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: file.s3Key,
    });
    const s3Response = await s3Client.send(command);

    if (!s3Response.Body) {
      logger.error("S3 returned empty body", { fileId, s3Key: file.s3Key });
      return c.json({ error: "File body unavailable" }, 502);
    }

    const contentLength = s3Response.ContentLength;
    const headers: Record<string, string> = {
      "Content-Type": file.mimeType,
      // Immutable content — safe to cache aggressively
      "Cache-Control": "private, max-age=3600, immutable",
      // Stable ETag equals fileId — enables 304 Not Modified
      ETag: `"${fileId}"`,
      // Show inline (images, PDFs) rather than forcing download
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
    };

    if (contentLength !== undefined) {
      headers["Content-Length"] = String(contentLength);
    }

    logger.debug("Streaming vault file", {
      fileId,
      mimeType: file.mimeType,
      contentLength,
    });

    // s3Response.Body is a SdkStream — convert to ReadableStream for Hono
    const body = s3Response.Body.transformToWebStream();
    return new Response(body, { status: 200, headers });
  } catch (err) {
    logger.error("Failed to stream file from S3", { fileId, err });
    return c.json({ error: "Failed to retrieve file" }, 502);
  }
});
