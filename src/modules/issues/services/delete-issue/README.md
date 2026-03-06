# deleteIssue — Service Handler

## Overview

**Type:** GraphQL Mutation
**Mutation:** `deleteIssue(input: DeleteIssueInput!): DeleteIssueResult!`

Soft-deletes an issue by setting `deletedAt = now()`. The issue is excluded from all queries but data is preserved for auditing.

## Flow

```
1. fetchIssue           → NOT_FOUND if missing/deleted
2. verifyProjectMember  → FORBIDDEN if not member
3. softDeleteIssue      → UPDATE issues SET deleted_at = now()
```

## Failure Modes

| Trigger | Error | Client Impact |
|---------|-------|--------------|
| Issue not found | NOT_FOUND | 404 |
| Not project member | FORBIDDEN | 403 |
