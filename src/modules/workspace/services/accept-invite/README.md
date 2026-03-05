# acceptInvite — Service Handler

## Overview

**Type:** GraphQL Mutation
**Path:** `services/accept-invite`
**Mutation:** `acceptWorkspaceInvite(input: AcceptInviteInput!): JoinResponse!`

Validates a workspace invite token and adds the authenticated user as a workspace member.

## Input / Output

| Field     | Type   | Description                           |
| --------- | ------ | ------------------------------------- |
| token     | String | The invite token from the invite link |
| userId    | String | Authenticated user's ID               |
| userEmail | String | Authenticated user's email            |

**Returns:** `{ success: Boolean!, message: String!, workspaceSlug: String! }`

## Flow

```
1. fetchInvite             → NOT_FOUND if token missing or expired
2. verifyInviteEmail       → FORBIDDEN if email doesn't match invite
3. checkExistingMembership → if already a member: delete invite, return early success
4. createMembership        → $transaction: create member + delete invite + fetch slug
```

## Failure Modes

| Trigger                    | Error Code                 | Status |
| -------------------------- | -------------------------- | ------ |
| Token not found or expired | INVITE_EXPIRED (NOT_FOUND) | 404    |
| Email mismatch             | INVITE_EXPIRED (FORBIDDEN) | 403    |
| Already a member           | — (early success)          | 200    |
