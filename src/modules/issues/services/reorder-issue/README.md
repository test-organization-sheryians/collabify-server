# reorderIssue — Service Handler

## Overview

**Type:** GraphQL Mutation
**Mutation:** `reorderIssue(input: ReorderIssueInput!): ReorderIssueResult!`

Updates the fractional position of an issue within its current column (in-column reordering).

## Flow

```
1. fetchIssue           → NOT_FOUND if missing/deleted
2. verifyProjectMember  → FORBIDDEN if not member
3. updatePosition       → UPDATE issues SET position = newPosition
```

## Failure Modes

| Trigger | Error | Client Impact |
|---------|-------|--------------|
| Issue not found | NOT_FOUND | 404 |
| Not project member | FORBIDDEN | 403 |
