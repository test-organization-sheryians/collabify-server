export enum NotificationChannel {
  EMAIL = "EMAIL",
  PUSH = "PUSH",
  IN_APP = "IN_APP",
  SMS = "SMS", // Future proofing
}

export enum NotificationPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

import { EventType, Payload } from "../payloads";

// ... (enums)

export interface EntityReference {
  type: string; // e.g., 'task', 'project'
  id: string;
}

// The strict shape of the raw event from domain services
// Discriminated Union: if type is 'workspace.invite', payload MUST be WorkspaceInviteSchema
export type NotificationEvent = {
  [K in EventType]: {
    type: K;
    payload: Payload<K>;
    actorId?: string;
    tenantId?: string;
    deduplicationId?: string;
  };
}[EventType];

// The shape of the job passed to Decider
export interface DeciderJobData {
  eventId: string; // Outbox ID
  type: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Delivery Job Definitions (Produce of Decider / Input to Channels)
// -----------------------------------------------------------------------------

export interface EmailJobData {
  to: string; // Recipient Email
  subject: string;
  html: string;
  text?: string;

  // Tracking
  eventId: string;
  userId: string;
}

export interface PushJobData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  image?: string;

  // Tracking
  eventId: string;
}

export interface InAppJobData {
  userId: string;

  // Content
  message: string; // The "toast" text
  link?: string; // Action URL
  avatarUrl?: string;

  // Tracking
  eventId: string;
}
