import { OutboxWriter } from "./lib/outbox.writer";
import { OutboxPoller } from "./engine/outbox-poller";
import { createDeciderWorker } from "./engine/decider.worker";
import { createFanOutWorker } from "./engine/fan-out.worker";
import { createBatchWorker } from "./engine/batch.worker";
import { createEmailWorker } from "./channels/email/email.worker";
import { createInAppWorker } from "./channels/in-app/in-app.worker";
import { createPushWorker } from "./channels/push/push.worker";
import { createRealTimeWorker } from "./channels/realtime/realtime.worker";

import { createRecoveryCron } from "./engine/recovery.cron";
import { createCleanupCron } from "./engine/cleanup.cron";

// Register Event Definitions
import "./events/definitions/workspace-invite";
import "./events/definitions/welcome-user";
import "./events/definitions/workspace-created";

/**
 * Notification Module Public API
 * This is the entry point for other modules (Workspace, Project, etc.) to interact with the notification system.
 */
export const NotificationModule = {
  /**
   * Triggers a notification event.
   * MUST be called within a transaction if the action is transactional.
   */
  notify: OutboxWriter.emit,

  /**
   * Starts the background poller engine.
   * Should be called at server startup (app/server.ts).
   */
  startEngine: async () => {
    await OutboxPoller.start();
    createDeciderWorker();
    createFanOutWorker();
    createEmailWorker();
    createInAppWorker();
    createPushWorker();
    createRealTimeWorker();
    createBatchWorker();

    // Background Crons
    createRecoveryCron();
    createCleanupCron();
  },
};

export * from "./core/types";
export * from "./core/errors";
