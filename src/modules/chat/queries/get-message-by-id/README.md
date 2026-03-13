# get-message-by-id

## Overview

| | |
|---|---|
| **Type** | GraphQL Query |
| **Path** | `src/modules/chat/queries/get-message-by-id` |
| **GQL Signature** | `getMessageById(messageId: ID!): ChatMessage` |
| **Auth** | Channel member + `conversation:read` permission |
| **DB Queries** | 1 (message fetch with full select) |

---

## Input / Output

### Input

| Field | Type | Constraint |
|---|---|---|
| `messageId` | `string` | ULID |

### Output

Returns `ChatMessage` or `null`.

---

## Execution Flow

```
resolver
  └─ handler
       └─ 1. assertAccess(messageId, ctx) → MessageByIdRow
              ├─ chatMessage.findUnique(select: messageSelect)   ← single DB query
              ├─ authGate.getChannel(conversationId)
              └─ parallel: assertChannelMember + permissions.assert("conversation:read")
```

**Key optimisation:** The original handler made 2 DB queries (one for `conversationId`, one for data). `assertAccess` fetches the message with a full `select` in a single query and passes the result back — the handler returns it directly.

---

## Redis Operations

| Key | Operation | Notes |
|---|---|---|
| Channel cache | `getChannel(conversationId)` read | Populated from auth cache; no write |

---

## Failure Modes

| Trigger | Error | Client impact |
|---|---|---|
| Missing `authGate` / `permissions` | `AppError 401 UNAUTHORIZED` | GraphQL auth error |
| `messageId` does not exist | `AppError 404 NOT_FOUND` | "Message not found" |
| `conversationId` not in channel cache | `AppError 404 NOT_FOUND` | "Conversation not found" |
| Caller not a channel member | `AppError 403 FORBIDDEN` | Permission denied |
| Caller lacks `conversation:read` | `AppError 403 FORBIDDEN` | Permission denied |
| Unexpected DB error | Raw `Error` re-thrown | GraphQL 500 |

---

## Performance Targets

| Path | Target |
|---|---|
| Fast path (channel in Redis cache) | < 10ms |
| Slow path (channel cache miss, DB fallback) | < 50ms |
