import { Hono, Context } from "hono";
import { ClerkWebhookService } from "../../services/clerk/webhook";
import { UserService } from "../../modules/user/service";
import { logger } from "../../shared/logger";

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
    logger.info({ eventType }, "Processing Clerk Webhook");

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
          logger.warn({ userId: id }, "Skipping user sync: No email found");
          return c.json({ success: true, skipped: "no_email" });
        }

        // 3. Module Layer: Execute Business Logic
        await UserService.syncUserFromClerk({
          clerkId: id,
          email: primaryEmail.email_address,
          fullName: `${first_name || ""} ${last_name || ""}`.trim(),
          avatarUrl: image_url,
        });

        logger.info({ userId: id }, "Successfully synced user");
        break;
      }

      case "user.deleted":
        logger.info(
          { userId: evt.data.id },
          "User deleted event ignored (Soft Delete Policy)"
        );
        break;

      default:
        logger.info({ eventType }, "Ignored unhandled event type");
    }

    return c.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Webhook Error");
    return c.text("Bad Request", 400);
  }
});

export default webhookRouter;
