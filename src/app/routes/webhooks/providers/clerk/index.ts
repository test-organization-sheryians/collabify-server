import { Hono, Context } from "hono";
import { ClerkWebhookService } from "@/services/clerk/webhook";
import {
  getClerkHandler,
  validateClerkEvent,
  type ClerkWebhookPayload,
} from "./handlers/index";
import { createLogger } from "@/shared/lib/logger";
import { WebhookProcessingError } from "../../errors";

const logger = createLogger("webhooks:clerk");
const clerkWebhookRoutes = new Hono();

clerkWebhookRoutes.post("/", async (c: Context) => {
  const payload = await c.req.text();
  const headers = {
    "svix-id": c.req.header("svix-id"),
    "svix-timestamp": c.req.header("svix-timestamp"),
    "svix-signature": c.req.header("svix-signature"),
  };

  try {
    const rawEvent = await ClerkWebhookService.verifyWebhook(payload, headers);
    const eventType = (rawEvent as { type: string }).type;

    logger.info("Processing Clerk Webhook", { eventType });

    const event = validateClerkEvent<ClerkWebhookPayload>(eventType, rawEvent);
    const handler = getClerkHandler(eventType);
    await handler(event);

    return c.json({ success: true });
  } catch (err) {
    if (err instanceof WebhookProcessingError) {
      logger.error("Webhook Processing Error", {
        code: err.code,
        message: err.message,
      });
      return c.json({ error: err.message }, err.statusCode as any);
    }

    logger.error("Webhook Error", { err });
    return c.text("Bad Request", 400);
  }
});

export { clerkWebhookRoutes };