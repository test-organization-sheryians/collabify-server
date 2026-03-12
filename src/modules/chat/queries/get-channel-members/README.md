# get-channel-members

## Overview

| | |
|--|--|
| **Type** | GraphQL Query |
| **Operation** | `getChannelMembers(channelId, limit, offset): [ChatMemberRecord!]!` |
| **Path** | `modules/chat/queries/get-channel-members/` |
| **Purpose** | Returns a paginated, role-priority sorted list of members in a chat channel. Only accessible to existing channel members. |

---

## Input / Output

### Input

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `channelId` | `ID (CUID)` | ✅ | — |
| `limit` | `Int` | No | `50` (max 100) |
| `offset` | `Int` | No | `0` |

### Output

Returns `[ChatMemberRecord!]!` — sorted by role rank (OWNER → ADMIN → MANAGER → MEMBER → GUEST), then by `joinedAt` ascending within each role.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `ID` | ChatMember row ID |
| `conversationId` | `ID` | Channel ID |
| `userId` | `ID` | Member's user ID |
| `role` | `String` | OWNER / ADMIN / MANAGER / MEMBER / GUEST |
| `isMuted` | `Boolean` | Whether user has muted the channel |
| `joinedAt` | `DateTime` | When the user joined |
| `lastReadMsgId` | `ID?` | Last message the user read |
| `lastDeliveredMsgId` | `ID?` | Last message delivered to user |
| `lastReadSeq` | `Int` | Read sequence pointer |
| `lastReadAt` | `DateTime` | Timestamp of last read |

---

## Flow Diagram

```
getChannelMembers(channelId, limit, offset)
        │
        ▼ requireUser(ctx)  [resolver-level]
        │
        ▼
Step 1: assertAccess
  ├── ctx.authGate.getChannel(channelId)
  │     → Redis GET auth:chan:{channelId}
  │     → DB fallback: ChatConversation.findUnique
  │     → 404 if not found
  │
  ├── ctx.authGate.assertChannelMember(channelId)   ← cached membership gate
  │     → Redis GET auth:chan:{channelId}:member:{userId}
  │     → DB fallback: chatMember.findUnique
  │     → 403 if not a member (negative result also cached)
  │
  └── ctx.permissions.assert("conversation.member:read", workspaceScope)
        → Redis permission cache
        → 403 if missing permission
        │
        ▼ (only if all checks pass)
Step 2: fetchChannelMembers
  ├── db.chatMember.findMany (paginated, explicit select, no N+1)
  └── in-memory sort by ROLE_ORDER map + joinedAt
        │
        ▼
Return [ChatMemberRecord!]!
```

---

## Redis Operations

| Key Pattern | Operation | TTL | Notes |
|-------------|-----------|-----|-------|
| `auth:chan:{channelId}` | GET | `CHANNEL_TTL` | Channel metadata cache |
| `auth:chan:{channelId}:member:{userId}` | GET | `MEMBERSHIP_TTL` | Membership check; negative ("0") also cached |
| `perm:{userId}:workspace:{workspaceId}:conversation.member:read` | GET | `PERMISSION_TTL` | Permission cache |

All three are served from Redis on a warm cache — the DB is **not touched** for auth on repeat requests.

---

## Failure Modes

| Trigger | Error | Client impact |
|---------|-------|---------------|
| `channelId` not a valid CUID | Zod validation error | `400 BAD_USER_INPUT` |
| Channel does not exist | `AppError.notFound` | `404 NOT_FOUND` |
| Caller not a channel member | `AppError.forbidden` | `403 FORBIDDEN` |
| Caller lacks `conversation.member:read` permission | `AppError.forbidden` | `403 FORBIDDEN` |
| DB query fails | Unhandled DB error | `500 INTERNAL_SERVER_ERROR` |

---

## Performance Notes

- **Warm cache (typical):** both auth checks are Redis GETs — sub-millisecond, zero DB queries
- **Cold cache (first access per user/channel):** 1–2 DB queries to prime the cache
- **DB query:** paginated with `take ≤ 100`, no JOINs, explicit select — fast index scan on `conversationId`
- **Sort:** in-memory after DB fetch; negligible for `≤ 100` rows

---

## DataLoader Note

`ChatMemberRecord` in the SDL **does not include a `user` field** — there is no N+1 concern at the GraphQL resolver level for this query. The `members-by-channel-id.loader.ts` DataLoader serves a different query (channel sidebar list, maps to `ConversationMember` not `ChatMemberRecord`).

---

## Improvement Plan

| Item | Priority | Notes |
|------|----------|-------|
| Add total count field | Low | Client needs total for pagination UI (consider `ChatMemberPage { members, total }` return type) |
| Role sort via DB `CASE` | Low | In-memory sort is fine at current scale; raw SQL `CASE` would eliminate the sort step |
| Cursor-based pagination | Medium | Offset becomes unreliable on large member lists with concurrent joins/leaves |
