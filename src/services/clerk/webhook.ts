import { Webhook } from "svix";
import { env } from "../../shared/config/env";
import { createLogger } from "../../shared/lib/logger";

const logger = createLogger("services:clerk");
import { ClerkWebhookEvent } from "./types";

export const ClerkWebhookService = {
  verifyWebhook(
    payload: string,
    headers: {
      "svix-id"?: string;
      "svix-timestamp"?: string;
      "svix-signature"?: string;
    }
  ): Promise<ClerkWebhookEvent> {
    const SIGNING_SECRET = env.CLERK_WEBHOOK_SIGNING_SECRET;

    if (!SIGNING_SECRET) {
      throw new Error("CLERK_WEBHOOK_SIGNING_SECRET is missing");
    }

    const wh = new Webhook(SIGNING_SECRET);

    try {
      // Cast strict types for svix
      const verified = wh.verify(payload, {
        "svix-id": headers["svix-id"]!,
        "svix-timestamp": headers["svix-timestamp"]!,
        "svix-signature": headers["svix-signature"]!,
      }) as ClerkWebhookEvent;

      return Promise.resolve(verified);
    } catch (err: unknown) {
      logger.error("Webhook verification failed", { err });
      throw new Error("Verification Failed");
    }
  },
};
