import { z } from "zod";
import {
  NotificationChannel,
  EmailJobData,
  PushJobData,
  InAppJobData,
} from "../core/types";
import { EventType, Payload, EventSchemas } from "../payloads";

// -----------------------------------------------------------------------------
// Transformer Types
// Maps the "Fat Payload" to the specific Channel Job Data
// -----------------------------------------------------------------------------
export type EmailTransformer<T extends EventType> = (
  payload: Payload<T>
) => Partial<Omit<EmailJobData, "eventId" | "userId" | "to">>;
export type PushTransformer<T extends EventType> = (
  payload: Payload<T>
) => Partial<Omit<PushJobData, "eventId" | "userId">>;
export type InAppTransformer<T extends EventType> = (
  payload: Payload<T>
) => Partial<Omit<InAppJobData, "eventId" | "userId">>;

export interface EventDefinition<T extends EventType> {
  type: T;
  channels: NotificationChannel[];

  // The Strategy: "Transformers" instead of "Templates"
  transformers: {
    [NotificationChannel.EMAIL]?: EmailTransformer<T>;
    [NotificationChannel.PUSH]?: PushTransformer<T>;
    [NotificationChannel.IN_APP]?: InAppTransformer<T>;

    // Legacy support (optional, can remove later)
    [NotificationChannel.SMS]?: never;
  };

  // Optimization Hooks (System Design 2.1)
  strategy?: {
    // If true, Decider skips fetching user preferences (Assumes ALL enabled)
    // Useful for Critical/Welcome emails where opting out isn't allowed or relevant yet.
    skipPreferences?: boolean;

    // If set, Decider verifies user has this role in the workspace before sending.
    requiresAccess?: "workspace_member";

    // Batching Configuration (System Design 4.4)
    batching?: {
      enabled: boolean;
      windowMs?: number; // default 5 minutes
    };
  };
}

const registry = new Map<EventType, EventDefinition<EventType>>();

export const EventRegistry = {
  // Generic Register Function - Enforces Type Safety
  register: <T extends EventType>(definition: EventDefinition<T>) => {
    registry.set(definition.type, definition);
  },

  get: (type: string): EventDefinition<EventType> | undefined => {
    return registry.get(type as EventType);
  },

  // Runtime Schema Lookup
  getSchema: (type: string): z.ZodTypeAny | undefined => {
    // @ts-expect-error - Index signature mismatch with string type
    return EventSchemas[type];
  },
};
