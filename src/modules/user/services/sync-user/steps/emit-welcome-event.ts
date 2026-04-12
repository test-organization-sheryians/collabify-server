/**
 * Emit a "welcome.user" outbox event (at-most-once).
 * Swallows P2002 / unique-constraint errors (already welcomed on a previous sync).
 * Logs all other errors but does NOT fail the sync.
 */
import { createLogger } from "@/shared/lib/logger";
import { emit } from "@/modules/notification/outbox/outbox-writer";
import type { User } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

const logger = createLogger("user:services:sync-user");

export async function emitWelcomeEvent(
  user: User,
  db: PrismaClient
): Promise<void> {
  try {
    await db.$transaction(async (tx) => emit(tx, {
      type: "user.welcome",
      payload: {
        userId: user.id,
        userName: user.fullName || "Collabify User",
        userEmail: user.email,
      },
      deduplicationId: `welcome-v1:${user.id}`,
    }));
  } catch (rawError: unknown) {
    const err = rawError as { code?: string; message?: string };
    if (err.code !== "P2002" && !err.message?.includes("Unique constraint")) {
      logger.error("Failed to queue welcome email", { err });
    }
  }
}
