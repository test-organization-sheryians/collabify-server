import { ServerWebSocket } from "bun";
import { Context } from "hono";
import { ZodSchema } from "zod";

/**
 * The Context attached to every WebSocket connection.
 * Determined during the Upgrade phase.
 */
export interface WSContext {
  workspaceId: string;
  userId: string;
  socketId: string;
  createdAt: number;
}

/**
 * The Typed Bun WebSocket
 */
export type ChatWebSocket = ServerWebSocket<WSContext>;

/**
 * Narrowed Event Type (Prepare for V2 Unions)
 */
export type EventType = string;

/**
 * Inbound Event Envelope (Client -> Server)
 * - Removed 'token' (Auth is at Upgrade)
 */
export interface InboundEnvelope {
  id: string; // Request ID ( UUID )
  type: EventType; // "chat:send-message"
  payload: unknown;
}

/**
 * Outbound Event Envelope (Server -> Client)
 * - success is optional (Broadcasts don't need it)
 */
export interface OutboundEnvelope<T = unknown> {
  id?: string; // Matches request ID if reply
  type: EventType; // "chat:new-message"
  success?: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Use this to standardize Error Responses
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

export const createSuccessFrame = (
  id: string | undefined,
  type: string,
  data?: unknown
): string => {
  const frame: OutboundEnvelope = {
    id,
    type,
    // success: true, // Optional for broadcasts, implied true for replies if data present?
    // Let's keep explicit true for replies to allow client easier parsing
    success: true,
    data,
  };
  return JSON.stringify(frame);
};

/**
 * The Handler Definition
 */
export type WSHandler<TInput = any> = (
  ctx: Context, // Hono Context (useful for dependency injection)
  socket: ChatWebSocket,
  input: TInput
) => Promise<void> | void;

export interface RouteDefinition<TInput = any> {
  schema: ZodSchema<TInput>;
  handler: WSHandler<TInput>;
}

export type RouteMap = Record<string, RouteDefinition>;
