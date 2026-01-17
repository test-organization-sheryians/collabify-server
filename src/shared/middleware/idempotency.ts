import { Context, Next } from "hono";
import { IdempotencyStore } from "../../infra/redis";
import { AppError } from "../errors";
import { logger } from "../logger";

import { stableStringify } from "../utils/canonical-json";

/**
 * Calculates SHA-256 hash of the payload using Bun's native Web Crypto.
 */
const hashPayload = async (body: unknown): Promise<string> => {
  const canonical = stableStringify(body);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);

  // Convert ArrayBuffer to Hex String
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

// -- MIDDLEWARE --

export const idempotencyMiddleware = async (c: Context, next: Next) => {
  const method = c.req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }

  const idempotencyKey = c.req.header("x-idempotency-key") as
    | string
    | undefined;
  if (!idempotencyKey) {
    return next();
  }

  // Note: Hono's c.req.json() can only be read once.
  // We need to clone or rely on Hono's body caching if available.
  let body: unknown = {};
  try {
    body = await c.req.raw.clone().json();
  } catch {
    body = {};
  }

  const hash = await hashPayload(body);
  const owner = crypto.randomUUID();
  const redisKey = `idempotency:${idempotencyKey}`;

  const result = await IdempotencyStore.acquire(redisKey, owner, hash);

  if (result === "LOCKED") {
    throw new AppError(
      "Request is currently processing. Please try again later.",
      "IDEMPOTENCY_LOCKED",
      429
    );
  }

  if (result === "CONFLICT") {
    throw new AppError(
      "Idempotency key reused with different payload.",
      "IDEMPOTENCY_CONFLICT",
      409
    );
  }

  if (result === "COMPLETED") {
    c.header("x-idempotency-replay", "true");
    return c.json({
      success: true,
      idempotent: true,
      message: "Request already processed successfully.",
    });
  }

  try {
    await next();
    await IdempotencyStore.complete(redisKey, owner);
  } catch (err) {
    const isSafeError =
      (err instanceof AppError && err.httpStatus < 500) ||
      (err instanceof Error && err.message.includes("Unique constraint"));

    if (isSafeError) {
      await IdempotencyStore.release(redisKey, owner).catch(() => {
        logger.error({ redisKey }, "Failed to release idempotency lock");
      });
    }

    throw err;
  }
};
