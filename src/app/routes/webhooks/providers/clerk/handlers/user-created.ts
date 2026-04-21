import { syncUser } from "@/modules/user";
import { db } from "@/infra/db";
import { redis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";
import type { UserCreatedPayload } from "../types";

const logger = createLogger("webhooks:clerk:user-created");

export async function handleUserCreated(event: UserCreatedPayload): Promise<void> {
  const data = event.data;

  const primaryEmail =
    data.email_addresses.find((e) => e.id === data.primary_email_address_id) ??
    data.email_addresses[0];

  if (!primaryEmail?.email_address) {
    logger.warn("Skipping user sync: No email found", { userId: data.id });
    return;
  }

  await syncUser(
    {
      clerkId: data.id,
      email: primaryEmail.email_address,
      fullName: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
      avatarUrl: data.image_url,
      emailVerified: primaryEmail.verification?.status === "verified",
    },
    { db, redis }
  );

  logger.info("Successfully synced user", { userId: data.id });
}