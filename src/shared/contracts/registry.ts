/**
 * CENTRALIZED CONTRACT REGISTRY
 *
 * Single source of truth for all WebSocket contracts.
 * Backend contracts MUST match frontend contracts exactly.
 *
 * ## Architecture
 *
 * - Each domain has its own folder (chat/, whiteboard/, presence/)
 * - Domains export: events.ts, upstream.ts, downstream.ts, index.ts
 * - All contracts are type-safe with Zod validation
 *
 * ## Usage
 *
 * ```typescript
 * import { Chat } from '@/shared/contracts/registry'
 *
 * // Use event enums
 * Chat.Events.Upstream.SendMessage // 'chat:send-message'
 *
 * // Use types
 * const payload: Chat.SendMessagePayload = {...}
 *
 * // Use schemas
 * const schema = Chat.ChatUpstreamSchemas[Chat.Events.Upstream.SendMessage]
 * ```
 */

// ============================================================================
// Domain Namespaces
// ============================================================================

export * as Chat from "./chat";

// ============================================================================
// Shared Types
// ============================================================================

export type {
  UpstreamContract,
  DownstreamContract,
  ServerResponse,
  DomainPrefix,
  EventName,
} from "./types";

// ============================================================================
// Re-exports for Convenience
// ============================================================================

export type { ChatUpstreamEvent, ChatDownstreamEvent } from "./chat";
