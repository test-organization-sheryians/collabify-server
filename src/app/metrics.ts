import {
  Registry,
  collectDefaultMetrics,
  Gauge,
  Counter,
  Histogram,
} from "prom-client";

export const registry = new Registry();

// Default metrics: heap, GC, event loop lag, CPU, etc.
collectDefaultMetrics({ register: registry });

// ── WebSocket ──────────────────────────────────────────────────────────────
export const wsConnections = new Gauge({
  name: "collabify_ws_connections_active",
  help: "Number of currently active WebSocket connections",
  registers: [registry],
});

export const wsMessagesTotal = new Counter({
  name: "collabify_ws_messages_total",
  help: "Total WebSocket messages processed",
  labelNames: ["direction"] as const, // 'inbound' | 'outbound'
  registers: [registry],
});

export const wsErrorsTotal = new Counter({
  name: "collabify_ws_errors_total",
  help: "Total WebSocket errors encountered",
  registers: [registry],
});

// ── HTTP ───────────────────────────────────────────────────────────────────
export const httpRequestDuration = new Histogram({
  name: "collabify_http_request_duration_seconds",
  help: "HTTP request latency in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const httpRequestsTotal = new Counter({
  name: "collabify_http_requests_total",
  help: "Total HTTP requests received",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [registry],
});
