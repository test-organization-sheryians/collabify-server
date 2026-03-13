# get-last-read-message

Returns the last-read message ID for the calling user in a channel. Used to track read state and compute unread counts on the client.

---

## Query

```graphql
getLastReadMessage(channelId: ID!): ID
```

Returns `null` when the user has never read any message in the channel — valid, not an error.

---

## Execution Flow

```
1. assertAccess(channelId, ctx)
   ├─ authGate + permissions non-null  → AppError 401
   ├─ getChannel(channelId)            → AppError 404 if not found
   └─ assertChannelMember
      permissions.assert("conversation:read")  → AppError 403

2. fetchLastRead(channelId, userId, ctx)
   └─ chatMember.findUnique → lastReadMsgId ?? null
```

---

## Auth Design

Channel-scoped per `auth-api-inventory.md`: `🔐 channel member` (no permission assert beyond `conversation:read`).

---

## Failure Modes

| Trigger | Error | HTTP |
|---------|-------|------|
| Not authenticated | `UNAUTHORIZED` | 401 |
| Channel not found | `NOT_FOUND` | 404 |
| Not a member | `FORBIDDEN` | 403 |
| DB crash | raw Error (logged) | 500 |
| No read state | — | returns `null` |
