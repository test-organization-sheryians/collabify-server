# get-message-reactions

## Overview

| | |
|---|---|
| **Type** | GraphQL Query |
| **Path** | `src/modules/chat/queries/get-message-reactions` |
| **GQL Signature** | `messageReactions(messageId: ID!): [MessageReaction!]!` |
| **Auth** | Channel member + `conversation:read` permission |
| **DB Queries** | 1 (message auth) + 0–1 (Redis cache miss rebuild only) |

---

## Input / Output

### Input

| Field | Type | Constraint |
|---|---|---|
| `messageId` | `string` | UUID |

### Output

Array of `MessageReaction` — `{ emoji, count, hasReacted, recentUsers }`.

---

## Execution Flow

```
resolver
  └─ handler
       ├─ 1. fetchMessageConversation(messageId)  → { conversationId }   (1 DB query)
       ├─ 2. assertAccess(conversationId, ctx)    → void                  (Redis-only, pure)
       │       ├─ authGate.getChannel(conversationId)
       │       └─ parallel: assertChannelMember + permissions.assert("conversation:read")
       └─ 3. fetchReactions(messageId, userId, ctx) → ReactionGroup[]
               ├─ HOT:  getReactionCounts(redis)  → build response
               └─ COLD: acquire lock → messageReaction.findMany → rebuildReactionCache → retry
```

---

## Redis Operations

| Key | Operation | Notes |
|---|---|---|
| `reactions:{messageId}` | `ZRANGEBYSCORE` (counts) | Hot path |
| `reactions:{messageId}:{emoji}` | `ZSCORE` (hasReacted) | Per emoji |
| `reactions:{messageId}:{emoji}:users` | `ZRANGEBYSCORE` (preview) | First 3 users |
| `rebuild:reactions:{messageId}` | `SETNX` / `DEL` | Distributed rebuild lock, TTL 30s |
| Channel cache | `getChannel(conversationId)` read | Auth cache |

---

## Failure Modes

| Trigger | Error | Client impact |
|---|---|---|
| Missing `authGate` / `permissions` | `AppError 401 UNAUTHORIZED` | Auth error |
| `messageId` does not exist | `AppError 404 NOT_FOUND` | "Message not found" |
| `conversationId` not in channel cache | `AppError 404 NOT_FOUND` | "Conversation not found" |
| Caller not a channel member | `AppError 403 FORBIDDEN` | Permission denied |
| Caller lacks `conversation:read` | `AppError 403 FORBIDDEN` | Permission denied |
| Redis unavailable | Raw `Error` re-thrown | GraphQL 500 |

---

## Performance Targets

| Path | Target |
|---|---|
| Hot (Redis populated) | < 15ms |
| Cold (cache miss, DB rebuild) | < 100ms |
