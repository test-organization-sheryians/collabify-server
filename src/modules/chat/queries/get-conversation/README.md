# get-conversation

**Type:** GraphQL Query
**Path:** `server/src/modules/chat/queries/get-conversation/`
**GraphQL:** `getConversation(conversationId: ID!): Conversation!`

Returns a single conversation with full membership details, unread count, and last message preview for the calling user.

---

## Input / Output

### Input

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| `conversationId` | `String` | CUID | ID of the conversation to fetch |

### Output (`Conversation`)

| Field | Source | Notes |
|-------|--------|-------|
| `id` | DB | conversation.id |
| `type` | DB | `CHANNEL`, `DM`, `THREAD` |
| `name` | DB | null for DMs |
| `topic` | DB | null if not set |
| `isPublic` | derived | `type === "CHANNEL"` |
| `workspaceId` | DB | — |
| `projectId` | DB | nullable |
| `parentMessageId` | DB | nullable, set for threads |
| `createdBy` | — | `null` — not tracked in current schema |
| `isArchived` | DB | true for archived channels |
| `memberCount` | derived | `conversation.members.length` |
| `unreadCount` | DB count | messages with `seq > lastReadSeq ?? 0` |
| `members` | DB | full member rows including user profile |
| `lastMessage` | DB | most recent non-deleted message preview |
| `createdAt` | DB | — |
| `updatedAt` | DB | — |
| `deletedAt` | DB | null if active |

---

## Execution Flow

```
Resolver
  └─ getConversationSchema.parse(args)   ← Zod validation (CUID check)
  └─ handler(input, ctx)
       │
       ├─ 1. assertAccess(conversationId, ctx)
       │       ├─ authGate null-check          → throw 401 if missing
       │       ├─ authGate.getChannel()        → Redis GET / DB fallback → throw 404 if absent
       │       ├─ assertChannelMember()   ┐    → Redis GET / DB fallback → throw 403 if not member
       │       └─ permissions.assert()   ┘ parallel
       │
       ├─ 2. [parallel]
       │       ├─ fetchConversation(conversationId, ctx)
       │       │       └─ chatConversation.findFirst (explicit select)
       │       └─ fetchLastMessage(conversationId, ctx)
       │               └─ chatMessage.findFirst (desc by createdAt)
       │
       ├─ 3. fetchUnreadCount(conversationId, userMember.lastReadSeq ?? null, ctx)
       │       └─ chatMessage.count(seq > lastReadSeq ?? 0, deletedAt: null)
       │
       └─ 4. buildResponse(row, unreadCount, lastMessage, userId)   ← pure mapping
```

---

## Redis Operations

| Operation | Key pattern | Notes |
|-----------|------------|-------|
| GET channel | `auth:chan:{conversationId}` | Set by `authGate.getChannel`. 5 min TTL. DB fallback on miss. |
| GET membership | `auth:chan:{conversationId}:member:{userId}` | Set by `assertChannelMember`. 5 min TTL. |
| GET permission | `perm:{userId}:workspace:{workspaceId}` | Set by `permissions.assert`. Invalidated on role change. |

All three checks are sub-millisecond on a warm cache. Cold path involves one DB read per check.

---

## Failure Modes

| Trigger | Step | Error | Client impact |
|---------|------|-------|---------------|
| Missing authGate/permissions context | `assertAccess` | `AppError 401 UNAUTHORIZED` | 401 response |
| conversationId not in Redis/DB | `assertAccess` | `AppError 404 NOT_FOUND` | 404 response |
| Caller not a channel member | `assertAccess` | `AppError 403 FORBIDDEN` | 403 response |
| Permission `conversation:read` denied | `assertAccess` | `AppError 403 FORBIDDEN` | 403 response |
| Conversation row missing after auth | `fetchConversation` | `AppError 404 NOT_FOUND` | 404 response |
| DB outage (any step) | `handler` catch | Raw error logged, re-thrown | 500 INTERNAL_SERVER_ERROR |

---

## Performance Targets

| Path | Latency target | Notes |
|------|---------------|-------|
| Warm cache (all Redis hits) | < 25ms | 3 Redis GETs + 3 DB queries in ~parallel |
| Cold cache (Redis miss) | < 80ms | 3 DB reads for auth + 3 for data |
| Large channel (hundreds of members) | < 100ms | Member list loaded in single query |

---

## Improvement Plan

The following issues were found during the refactor audit but not fixed in this iteration:

| Issue | Location | Effort | Notes |
|-------|----------|--------|-------|
| `unreadCount` aggregation in same request as conversation fetch | `fetchUnreadCount` | Medium | Could be pushed to a lazy-loaded field resolver to avoid counting on every fetch |
| `members` field includes all members regardless of pagination | `fetchConversation` | Medium | For large channels (1000+ members), the member list should be paginated or moved to a separate `getChannelMembers` query |
| `lastMessage.content` is `JsonValue` (Prisma) | `LastMessageRow` type | Low | If content is always a string in practice, the DB column type should be `Text`, not `Json` |
| `createdBy` always returns `null` | `buildResponse` | Low | The schema has this field but the DB doesn't track it — either drop the SDL field or add the column |
