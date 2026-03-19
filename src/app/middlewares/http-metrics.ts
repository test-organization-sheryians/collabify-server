import { createMiddleware } from "hono/factory";
import { httpRequestDuration, httpRequestsTotal } from "../metrics";

const SKIP_PATHS = new Set(["/metrics", "/ws", "/health"]);

/**
 * Records HTTP request duration + count for every route.
 * Skips noisy internal paths (/metrics, /ws, /health).
 */
export const httpMetricsMiddleware = createMiddleware(async (c, next) => {
  if (SKIP_PATHS.has(c.req.path)) {
    return next();
  }

  const start = Date.now();
  await next();
  const duration = (Date.now() - start) / 1000;

  const labels = {
    method: c.req.method,
    route: c.req.routePath ?? c.req.path,
    status_code: String(c.res.status),
  };

  httpRequestDuration.observe(labels, duration);
  httpRequestsTotal.inc(labels);
});
