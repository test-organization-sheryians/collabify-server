import { z } from "zod";

/**
 * UPSTREAM PAYLOADS (Client → Server)
 * Whiteboard WebSocket event contracts
 */

// Subscribe to board session
export const SubscribeBoardPayloadSchema = z.object({
  boardId: z.string().min(1),
  stateVector: z.string().optional(), // Client's Y.Doc state vector for computing diff
});
export type SubscribeBoardPayload = z.infer<typeof SubscribeBoardPayloadSchema>;

// Unsubscribe from board
export const UnsubscribeBoardPayloadSchema = z.object({
  boardId: z.string().min(1),
});
export type UnsubscribeBoardPayload = z.infer<
  typeof UnsubscribeBoardPayloadSchema
>;

// Board update (Y.Doc binary delta)
export const BoardUpdatePayloadSchema = z.object({
  boardId: z.string().min(1),
  update: z.string(), // Base64-encoded Y.Doc update binary
  dedupeId: z.string().uuid(), // Client-side deduplication ID
});
export type BoardUpdatePayload = z.infer<typeof BoardUpdatePayloadSchema>;

// Cursor move (ephemeral)
export const CursorMovePayloadSchema = z.object({
  boardId: z.string().min(1),
  x: z.number(),
  y: z.number(),
});
export type CursorMovePayload = z.infer<typeof CursorMovePayloadSchema>;

// Selection change (ephemeral)
export const SelectionChangePayloadSchema = z.object({
  boardId: z.string().min(1),
  elementIds: z.array(z.string()),
});
export type SelectionChangePayload = z.infer<
  typeof SelectionChangePayloadSchema
>;

// Pointer down (drawing start)
export const PointerDownPayloadSchema = z.object({
  boardId: z.string().min(1),
});
export type PointerDownPayload = z.infer<typeof PointerDownPayloadSchema>;

// Pointer up (drawing end)
export const PointerUpPayloadSchema = z.object({
  boardId: z.string().min(1),
});
export type PointerUpPayload = z.infer<typeof PointerUpPayloadSchema>;

// Request snapshot (recovery)
export const RequestSnapshotPayloadSchema = z.object({
  boardId: z.string().min(1),
  fromStreamId: z.string().optional(), // Client's last known stream ID
});
export type RequestSnapshotPayload = z.infer<
  typeof RequestSnapshotPayloadSchema
>;

/**
 * DOWNSTREAM EVENTS (Server → Client)
 * What clients receive from the server
 */

// Board initial state (sent on subscribe)
export const BoardInitialStateSchema = z.object({
  type: z.literal("whiteboard:board-init"),
  data: z.object({
    boardId: z.string().min(1),
    snapshot: z.string(), // Base64-encoded Y.Doc state
    streamId: z.string(), // Current stream ID for delta syncing
    elementCount: z.number().int().min(0),
    collaborators: z.array(
      z.object({
        userId: z.string(),
        fullName: z.string(),
        avatarUrl: z.string().nullable(),
      })
    ),
  }),
});
export type BoardInitialStateEvent = z.infer<typeof BoardInitialStateSchema>;

// Board update broadcast
export const BoardUpdateEventSchema = z.object({
  type: z.literal("whiteboard:board-update"),
  data: z.object({
    boardId: z.string().min(1),
    streamId: z.string(),
    update: z.string(), // Base64-encoded Y.Doc update
    authorId: z.string(),
    sequence: z.number().int().min(0),
    timestamp: z.string().datetime(),
  }),
});
export type BoardUpdateEvent = z.infer<typeof BoardUpdateEventSchema>;

// Cursor position update
export const CursorUpdateEventSchema = z.object({
  type: z.literal("whiteboard:cursor-update"),
  data: z.object({
    boardId: z.string().min(1),
    userId: z.string(),
    x: z.number(),
    y: z.number(),
    timestamp: z.string().datetime(),
  }),
});
export type CursorUpdateEvent = z.infer<typeof CursorUpdateEventSchema>;

// Selection update
export const SelectionUpdateEventSchema = z.object({
  type: z.literal("whiteboard:selection-update"),
  data: z.object({
    boardId: z.string().min(1),
    userId: z.string(),
    elementIds: z.array(z.string()),
    timestamp: z.string().datetime(),
  }),
});
export type SelectionUpdateEvent = z.infer<typeof SelectionUpdateEventSchema>;

// User joined board
export const UserJoinedEventSchema = z.object({
  type: z.literal("whiteboard:user-joined"),
  data: z.object({
    boardId: z.string().min(1),
    userId: z.string(),
    fullName: z.string(),
    avatarUrl: z.string().nullable(),
    timestamp: z.string().datetime(),
  }),
});
export type UserJoinedEvent = z.infer<typeof UserJoinedEventSchema>;

// User left board
export const UserLeftEventSchema = z.object({
  type: z.literal("whiteboard:user-left"),
  data: z.object({
    boardId: z.string().min(1),
    userId: z.string(),
    timestamp: z.string().datetime(),
  }),
});
export type UserLeftEvent = z.infer<typeof UserLeftEventSchema>;

// Board locked
export const BoardLockedEventSchema = z.object({
  type: z.literal("whiteboard:board-locked"),
  data: z.object({
    boardId: z.string().min(1),
    lockedBy: z.string(),
    timestamp: z.string().datetime(),
  }),
});
export type BoardLockedEvent = z.infer<typeof BoardLockedEventSchema>;

// Board unlocked
export const BoardUnlockedEventSchema = z.object({
  type: z.literal("whiteboard:board-unlocked"),
  data: z.object({
    boardId: z.string().min(1),
    unlockedBy: z.string(),
    timestamp: z.string().datetime(),
  }),
});
export type BoardUnlockedEvent = z.infer<typeof BoardUnlockedEventSchema>;

// Presence update (drawing state)
export const PresenceUpdateEventSchema = z.object({
  type: z.literal("whiteboard:presence-update"),
  data: z.object({
    boardId: z.string().min(1),
    userId: z.string(),
    isDrawing: z.boolean(),
    timestamp: z.string().datetime(),
  }),
});
export type PresenceUpdateEvent = z.infer<typeof PresenceUpdateEventSchema>;

// Snapshot response (recovery)
export const SnapshotResponseSchema = z.object({
  type: z.literal("whiteboard:snapshot-response"),
  data: z.object({
    boardId: z.string().min(1),
    snapshot: z.string(), // Base64-encoded Y.Doc state
    streamId: z.string(),
    elementCount: z.number().int().min(0),
  }),
});
export type SnapshotResponseEvent = z.infer<typeof SnapshotResponseSchema>;

// Discriminated union of all downstream events
export const OutboundWhiteboardEventSchema = z.discriminatedUnion("type", [
  BoardInitialStateSchema,
  BoardUpdateEventSchema,
  CursorUpdateEventSchema,
  SelectionUpdateEventSchema,
  UserJoinedEventSchema,
  UserLeftEventSchema,
  BoardLockedEventSchema,
  BoardUnlockedEventSchema,
  PresenceUpdateEventSchema,
  SnapshotResponseSchema,
]);

export type OutboundWhiteboardEvent = z.infer<
  typeof OutboundWhiteboardEventSchema
>;
