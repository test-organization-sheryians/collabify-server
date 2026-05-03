import { createLogger } from "@/shared/lib/logger";
import { env } from "@/shared/config/env";
import { AppError } from "@/shared/errors";

// =============================================================================
// FCM (Firebase Cloud Messaging) Push Adapter
//
// Status: STUB — real implementation pending device-token registry.
//
// To fully implement:
//   1. Install firebase-admin: `bun add firebase-admin`
//   2. Parse env.FIREBASE_SERVICE_ACCOUNT_JSON → ServiceAccount object
//   3. Call admin.initializeApp({ credential: admin.credential.cert(sa) })
//   4. Build MulticastMessage with tokens resolved from device token registry
//   5. Call admin.messaging().sendEachForMulticast(message)
//
// Behaviour until then:
//   - development/test: logs a clear warning, no-op (allows other channels to work)
//   - production:       throws AppError(501) so the job fails visibly and alerts fire
// =============================================================================

const logger = createLogger("services:push-provider:fcm");

export const sendWithFCM = async (
  to: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> => {
  if (env.NODE_ENV === "production") {
    // Explicit production failure — surfaces in BullMQ dead-letter queue,
    // metrics, and error monitoring. Better than silent console logging.
    throw new AppError(
      "FCM push adapter is not yet implemented. Set PUSH_PROVIDER=console to suppress this error.",
      "NOTIFICATION_PROVIDER_ERROR",
      501,
      true,
      { provider: "fcm", to, title }
    );
  }

  // Development / test: log clearly so developers know this is a stub.
  logger.warn(
    "📱 [FCM STUB] Push notification would be sent in production. Set PUSH_PROVIDER=console to suppress.",
    {
      toCount: to.length,
      title,
      body,
      data,
    }
  );
};
