import { z } from "zod";
import { WebhookValidationError, WebhookNotFoundError } from "@/app/routes/webhooks/errors";
import type { ClerkWebhookPayload } from "../types";
import {
  UserCreatedPayloadSchema,
  UserUpdatedPayloadSchema,
  UserDeletedPayloadSchema,
} from "../types";
import { handleUserCreated } from "./user-created";
import { handleUserUpdated } from "./user-updated";
import { handleUserDeleted } from "./user-deleted";

export type ClerkWebhookHandler<
  T extends ClerkWebhookPayload = ClerkWebhookPayload
> = (event: T) => Promise<void>;

export interface HandlerEntry<
  T extends ClerkWebhookPayload = ClerkWebhookPayload
> {
  handler: ClerkWebhookHandler<T>;
  schema: z.ZodType<T>;
}

const handlerRegistry: Record<string, HandlerEntry> = {
  "user.created": {
    handler: handleUserCreated as ClerkWebhookHandler,
    schema: UserCreatedPayloadSchema,
  },
  "user.updated": {
    handler: handleUserUpdated as ClerkWebhookHandler,
    schema: UserUpdatedPayloadSchema,
  },
  "user.deleted": {
    handler: handleUserDeleted as ClerkWebhookHandler,
    schema: UserDeletedPayloadSchema,
  },
};

export function getClerkHandler<T extends ClerkWebhookPayload>(
  eventType: string
): ClerkWebhookHandler<T> {
  const entry = handlerRegistry[eventType];
  if (!entry) {
    throw new WebhookNotFoundError("clerk", eventType);
  }
  return entry.handler as ClerkWebhookHandler<T>;
}

export function validateClerkEvent<T extends ClerkWebhookPayload>(
  eventType: string,
  data: unknown
): T {
  const entry = handlerRegistry[eventType];
  if (!entry) {
    throw new WebhookNotFoundError("clerk", eventType);
  }
  const result = entry.schema.safeParse(data);
  if (!result.success) {
    throw new WebhookValidationError(
      `Invalid payload for ${eventType}: ${result.error.message}`
    );
  }
  return result.data as T;
}

export {
  handleUserCreated,
  handleUserUpdated,
  handleUserDeleted,
  UserCreatedPayloadSchema,
  UserUpdatedPayloadSchema,
  UserDeletedPayloadSchema,
};

export type { ClerkWebhookPayload } from "../types";