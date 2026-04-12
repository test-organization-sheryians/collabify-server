import { createWorker } from "@/services/bullmq";
import { emailProvider } from "@/services/email-provider";
import { QUEUE_NAMES, CONCURRENCY } from "../../constants";
import { createLogger } from "@/shared/lib/logger";
import * as idempotencyGuard from "../../shared/idempotency/idempotency-guard";
import * as registry from "../../events/registry";
import type { EmailJobData } from "../../events/types";

// =============================================================================
// Email Worker (Phase 4.1)
//
// Processes EmailQueue jobs. Responsibilities:
//   1. Idempotency check (channel-scoped key: email:{eventId}:{userId})
//   2. Look up registered handler → call handler.buildEmail()
//   3. If buildEmail returns undefined → skip (handler opted out per recipient)
//   4. Send via emailProvider (provider-agnostic: SES / Resend / SendGrid / console)
//
// Does NOT make delivery decisions. That is the Decider's job.
// This worker only executes what the Decider already decided.
// =============================================================================

const logger = createLogger("notification:channel:email");

export const createEmailWorker = () =>
  createWorker<EmailJobData>(
    QUEUE_NAMES.EMAIL,
    async (job) => {
      const { eventId, recipientUserId, content, idempotencyKey } = job.data;

      // ── 1. Idempotency ───────────────────────────────────────────────────
      const allowed = await idempotencyGuard.check(
        eventId,
        "email",
        recipientUserId ?? undefined
      );
      if (!allowed) {
        logger.debug("Email job: duplicate dropped", { eventId, recipientUserId });
        return;
      }

      // ── 2. Send ──────────────────────────────────────────────────────────
      logger.debug("Email job: sending", {
        jobId:   job.id,
        eventId,
        to:      content.to,
        subject: content.subject,
      });

      try {
        // emailProvider abstracts SES / Resend / SendGrid / Nodemailer / console
        // It accepts (to, subject, html) — we pass subject + template as html for now.
        // When React Email templates are added, render them here before calling send().
        await emailProvider.send(content.to, content.subject, buildHtml(content));

        logger.info("Email job: delivered", { eventId, to: content.to });
      } catch (err) {
        logger.error("Email job: delivery failed", { err, eventId, to: content.to });
        throw err; // BullMQ will retry per queue options
      }
    },
    { concurrency: CONCURRENCY.EMAIL }
  );

// -----------------------------------------------------------------------------
// Minimal HTML fallback until React Email templates are wired in (Phase 7+)
// Each event handler's buildEmail() returns template + data — replace this
// with a template renderer once templates/ directory is populated.
// -----------------------------------------------------------------------------
function buildHtml(content: { template: string; data: Record<string, unknown> }): string {
  const entries = Object.entries(content.data)
    .map(([k, v]) => `<tr><td><b>${k}</b></td><td>${String(v)}</td></tr>`)
    .join("");
  return `<table>${entries}</table>`;
}
