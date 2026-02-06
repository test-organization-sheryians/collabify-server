/**
 * Base contract types - domain-agnostic
 *
 * These types form the foundation for all WebSocket contracts.
 * They are generic and can be used by any domain (chat, whiteboard, presence).
 */

export type DomainPrefix = "chat" | "whiteboard" | "presence";

export type EventName<
  TDomain extends DomainPrefix,
  TAction extends string,
> = `${TDomain}:${TAction}`;

/**
 * Upstream (Client → Server) Contract
 *
 * Represents a command sent from the client to the server.
 */
export interface UpstreamContract<TEvent extends string, TPayload> {
  type: TEvent;
  payload: TPayload;
}

/**
 * Downstream (Server → Client) Contract
 *
 * Represents an event sent from the server to the client.
 */
export interface DownstreamContract<TEvent extends string, TPayload> {
  type: TEvent;
  data: TPayload;
}

/**
 * Server Response Envelope
 *
 * The actual WebSocket message structure sent to clients.
 */
export interface ServerResponse<TData = unknown> {
  id?: string;
  type: string;
  success?: boolean;
  data?: TData;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
