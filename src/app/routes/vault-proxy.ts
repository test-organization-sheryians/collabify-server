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
  const auth = getAuth(c);
  const userId = auth?.userId ?? null;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { fileId } = c.req.param();

  if (!fileId || typeof fileId !== "string") {
    return c.json({ error: "Missing fileId" }, 400);
  }

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
    return c.json({ error: "File is not yet available" }, 202);
  }

  const { auth: authGate } = createGraphQLAuthContext(userId, db, redis);
  try {
    await authGate.assertProjectMember(file.projectId);
  } catch {
    return c.json({ error: "Forbidden" }, 403);
  }

  const ifNoneMatch = c.req.header("If-None-Match");
  if (ifNoneMatch === `"${fileId}"`) {
    return new Response(null, { status: 304 });
  }

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
      "Cache-Control": "private, max-age=3600, immutable",
      ETag: `"${fileId}"`,
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

    const body = s3Response.Body.transformToWebStream();
    return new Response(body, { status: 200, headers });
  } catch (err) {
    logger.error("Failed to stream file from S3", { fileId, err });
    return c.json({ error: "Failed to retrieve file" }, 502);
  }
});
