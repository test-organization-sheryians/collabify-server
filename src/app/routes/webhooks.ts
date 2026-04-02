import { Hono, Context } from "hono";
import { ClerkWebhookService } from "../../services/clerk/webhook";
import { syncUser } from "../../modules/user";
import { createLogger } from "../../shared/lib/logger";
import { db } from "../../infra/db";
import { redis } from "../../infra/redis";

const logger = createLogger("app:webhooks");
const webhookRouter = new Hono();

webhookRouter.post("/api/webhooks/clerk", async (c: Context) => {
  const payload = await c.req.text();
  const headers = {
    "svix-id": c.req.header("svix-id"),
    "svix-timestamp": c.req.header("svix-timestamp"),
    "svix-signature": c.req.header("svix-signature"),
  };

  try {
    // 1. Service Layer: Verify Signature
    const evt = await ClerkWebhookService.verifyWebhook(payload, headers);

    // 2. Application Layer: Route Logic
    const eventType = evt.type;
    logger.info("Processing Clerk Webhook", { eventType });

    switch (eventType) {
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } =
          evt.data;
        const primaryEmail =
          email_addresses.find(
            (e) => e.id === evt.data.primary_email_address_id
          ) || email_addresses[0];

        if (!primaryEmail?.email_address) {
          logger.warn("Skipping user sync: No email found", { userId: id });
          return c.json({ success: true, skipped: "no_email" });
        }

        // 3. Module Layer: Execute Business Logic
        await syncUser(
          {
            clerkId: id,
            email: primaryEmail.email_address,
            fullName: `${first_name || ""} ${last_name || ""}`.trim(),
            avatarUrl: image_url,
            emailVerified: primaryEmail.verification?.status === "verified",
          },
          { db, redis }
        );

        logger.info("Successfully synced user", { userId: id });
        break;
      }

      case "user.deleted": {
        const userId = evt.data.id;
        if (!userId) {
          logger.warn("user.deleted webhook missing id — skipping");
          break;
        }
        await db.user.update({
          where: { id: userId },
          data: {
            deletedAt: new Date(),
            status: "DELETED",
          },
        });
        logger.info("Soft-deleted user via webhook", { userId });
        break;
      }

      default:
        logger.info("Ignored unhandled event type", { eventType });
    }

    return c.json({ success: true });
  } catch (err) {
    logger.error("Webhook Error", { err });
    return c.text("Bad Request", 400);
  }
});

export default webhookRouter;
