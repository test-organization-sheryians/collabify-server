import { z } from "zod";

export const TransferWorkspaceOwnershipSchema = z.object({
  workspaceId: z.string(),
  actorUserId: z.string(),
  newOwnerId: z.string(),
});

export type TransferWorkspaceOwnershipInput = z.infer<
  typeof TransferWorkspaceOwnershipSchema
>;
