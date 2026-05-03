import { z } from "zod";
import type { EventDefinition } from "../../types";
export const PayloadSchema = z.object({ workspaceId: z.string(), workspaceName: z.string(), workspaceSlug: z.string(), usedBytes: z.number(), limitBytes: z.number(), usagePct: z.number(), ownerId: z.string(), upgradeUrl: z.string().url() });
export type Payload = z.infer<typeof PayloadSchema>;
export const definition: EventDefinition = { type: "vault.storage.limit", priority: "HIGH", recipientMode: "single", channels: ["EMAIL", "IN_APP"], category: "system_admin", payloadSchema: PayloadSchema, rateLimit: { window: 86_400_000, max: 1, scope: "per_user_per_entity", entityKey: "workspaceId" } };
