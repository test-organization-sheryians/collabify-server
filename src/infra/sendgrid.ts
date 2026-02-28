import sgMail from "@sendgrid/mail";
import { env } from "@/shared/config/env";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("infra:email");

/**
 * SendGrid Client Initialization
 * Centralized setup for SendGrid API Key.
 */

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
} else if (env.EMAIL_PROVIDER === "sendgrid") {
  logger.warn("SendGrid API Key is missing but Provider is set to SendGrid.");
}

export const sendGridClient = sgMail;
