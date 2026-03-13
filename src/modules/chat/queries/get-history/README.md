# get-history

Provides paginated message history for a conversation using sequence-number cursor pagination.

---

## Query

```graphql
history(conversationId: ID!, beforeSequence: Int!, limit: Int): HistoryPayload!
```

Returns messages with `sequence < beforeSequence`, ordered newest-first (DESC). Uses `limit+1` strategy to detect `hasMore` without a separate COUNT query.

---

## Execution Flow

```
1. assertAccess(conversationId, ctx)
   ├─ authGate + permissions non-null   → AppError 401
   ├─ getChannel(conversationId)        → AppError 404 if not found
   └─ assertChannelMember
      permissions.assert("conversation:read")  → AppError 403

2. fetchMessages(conversationId, beforeSequence, limit, ctx)
   └─ chatMessage.findMany (sequence < beforeSequence, desc, take: limit+1)

3. buildResponse(messages, limit)
   └─ pure: slice to limit, compute hasMore + minSequence
```

---

## Auth Design

Channel-scoped auth per `auth-api-inventory.md`: `🔐 channel member + 🔑 conversation:read`

---

## Pagination Design

- Cursor: `beforeSequence` — fetch messages with `sequence < beforeSequence`
- `limit+1` fetch strategy — avoids COUNT query for `hasMore`
- Messages ordered `sequence DESC` (newest first within the returned page)
- `minSequence` = lowest sequence in current page = next cursor for the following page

---

## Failure Modes

| Trigger | Error | HTTP |
|---------|-------|------|
| Not authenticated | `UNAUTHORIZED` | 401 |
| Channel not found | `NOT_FOUND` | 404 |
| Not a member | `FORBIDDEN` | 403 |
| No permission | `FORBIDDEN` | 403 |
| DB crash | raw Error (logged) | 500 |
