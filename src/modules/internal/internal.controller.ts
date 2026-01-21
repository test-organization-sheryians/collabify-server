import { Hono, Context } from "hono";
import { getWSMetrics } from "../../infra/ws-gateway";
import { assignWorkspace } from "./services/assign-workspace/handler";

const app = new Hono();

// Internal Assignment Service (Called by Nginx)
app.post("/assign-workspace", async (c: Context) => {
  const body = await c.req.json();
  const { workspaceId } = body;

  if (!workspaceId) return c.json({ error: "Missing workspaceId" }, 400);

  try {
    const result = await assignWorkspace({ workspaceId }, c);
    return c.json(result);
  } catch (_err) {
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.get("/metrics", (c: Context) => {
  const wsMetrics = getWSMetrics();
  return c.json({
    ...wsMetrics,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

export const internalRoutes = app;
