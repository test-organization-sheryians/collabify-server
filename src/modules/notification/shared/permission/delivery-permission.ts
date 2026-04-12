import { db } from "@/infra/db";
import { createLogger } from "@/shared/lib/logger";

// =============================================================================
// Delivery Permission Check
//
// Validates that the recipient STILL has permission to receive a notification
// at delivery time — not just at the time the event was emitted.
//
// Why at delivery time:
//   - Gap between event emission and worker processing can be seconds/minutes.
//   - In that window: user could be removed from workspace/project.
//   - Delivering a notification about content the user can no longer access
//     is a privacy/security issue.
//
// This is a last-mile check — intentionally lightweight (index lookups only).
// =============================================================================

const logger = createLogger("notification:shared:permission");

export type PermissionCheck = "workspace_member" | "project_member" | "none";

/**
 * Returns true if the recipient has permission to receive this notification.
 * Returns false if they've lost access since the event was emitted.
 */
export async function hasDeliveryPermission(params: {
  userId:     string;
  check:      PermissionCheck;
  contextId?: string; // workspaceId or projectId depending on check type
}): Promise<boolean> {
  const { userId, check, contextId } = params;

  if (check === "none" || !contextId) return true;

  try {
    if (check === "workspace_member") {
      const member = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: contextId, userId } },
        select: { userId: true },
      });
      if (!member) {
        logger.info("Delivery permission denied — user no longer workspace member", {
          userId,
          workspaceId: contextId,
        });
        return false;
      }
    }

    if (check === "project_member") {
      const member = await db.projectMember.findFirst({
        where: { projectId: contextId, userId },
        select: { userId: true },
      });
      if (!member) {
        logger.info("Delivery permission denied — user no longer project member", {
          userId,
          projectId: contextId,
        });
        return false;
      }
    }

    return true;
  } catch (err) {
    // DB error → allow delivery (prefer false positive over false negative for security)
    logger.warn("Permission check failed — allowing delivery", { err, ...params });
    return true;
  }
}
