import { ServerWebSocket } from "bun";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { ZodSchema } from "zod";

/**
 * Generic Socket Data (domain-agnostic)
 *
 * Attached to every WebSocket connection during the upgrade phase.
 * Contains authentication and connection metadata.
 */
export interface WSSocketData {
  workspaceId: string;
  userId: string;
  socketId: string;
  createdAt: number;
}

/**
 * Generic WebSocket (no domain coupling)
 *
 * Replaces the old chat-specific "ChatWebSocket" name.
 * This can be used by any feature (chat, whiteboard, presence, etc.)
 */
export type GenericWebSocket = ServerWebSocket<WSSocketData>;

/**
 * WebSocket Handler Context
 *
 * Similar to GraphQL's ApplicationContext - provides db, redis, auth.
 * This allows handlers to use ctx.db consistent with GraphQL handlers.
 */
export interface WSHandlerContext {
  db: PrismaClient;
  redis: Redis;
  auth: {
    userId: string;
    workspaceId: string;
  };
}

/**
 * Generic Event Type
 *
 * In the future, this could be narrowed to specific domain events.
 */
export type EventType = string;

/**
 * Inbound Event Envelope (Client → Server)
 *
 * The structure of messages received from clients.
 * Auth is handled at the upgrade phase, not in the message.
 */
export interface InboundEnvelope<TPayload = unknown> {
  id: string; // Request ID (UUID)
  type: EventType; // e.g., "chat:send-message"
  payload: TPayload;
}

/**
 * Outbound Event Envelope (Server → Client)
 *
 * The structure of messages sent to clients.
 * - success is optional (broadcasts don't need it)
 * - data contains the payload
 * - error contains error details if any
 */
export interface OutboundEnvelope<TData = unknown> {
  id?: string; // Matches request ID if reply
  type: EventType; // e.g., "chat:new-message"
  success?: boolean;
  data?: TData;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Create standardized error response frame
 *
 * @param id - Request ID (optional)
 * @param type - Event type
 * @param code - Error code
 * @param message - Error message
 * @param details - Additional error details (optional)
 * @returns JSON string
 */
export const createErrorFrame = (
  id: string | undefined,
  type: string,
  code: string,
  message: string,
  details?: unknown
): string => {
  const frame: OutboundEnvelope = {
    id,
    type,
    success: false,
    error: { code, message, details },
  };
  return JSON.stringify(frame);
};

/**
 * Create standardized success response frame
 *
 * @param id - Request ID (optional)
 * @param type - Event type
 * @param data - Response data (optional)
 * @returns JSON string
 */
export const createSuccessFrame = (
  id: string | undefined,
  type: string,
  data?: unknown
): string => {
  const frame: OutboundEnvelope = {
    id,
    type,
    success: true,
    data,
  };
  return JSON.stringify(frame);
};

/**
 * WebSocket Handler Function Signature
 *
 * Handlers receive context, socket, and validated input.
 * They should not return values - all responses go through socket.send().
 *
 * @param ctx - Handler context (db, redis, auth)
 * @param socket - WebSocket connection
 * @param input - Validated payload (parsed by Zod)
 */
export type WSHandler<TInput = any> = (
  ctx: WSHandlerContext,
  socket: GenericWebSocket,
  input: TInput
) => Promise<void> | void;

/**
 * Route Definition
 *
 * Combines a Zod schema for validation with a handler function.
 */
export interface RouteDefinition<TInput = any> {
  schema: ZodSchema<TInput>;
  handler: WSHandler<TInput>;
}

/**
 * Route Map
 *
 * Maps event type strings to their route definitions.
 * Example: { "chat:send-message": { schema, handler } }
 */
export type RouteMap = Record<string, RouteDefinition>;
