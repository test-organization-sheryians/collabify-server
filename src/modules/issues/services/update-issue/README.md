# updateIssue — Service Handler

## Overview

**Type:** GraphQL Mutation
**Mutation:** `updateIssue(input: UpdateIssueInput!): UpdateIssueResult!`

Patches mutable issue fields (title, priority, assignee, dueDate, labels). Description is managed separately via the S3 upload flow.

## Flow

```
1. fetchIssue           → NOT_FOUND if missing/deleted
2. verifyProjectMember  → FORBIDDEN if not member
3. validateLabels       → BAD_REQUEST if any label not in project (no-op if undefined)
4. updateIssue          → $transaction: delete+recreate labels, patch fields
```

## Failure Modes

| Trigger | Error | Client Impact |
|---------|-------|--------------|
| Issue not found | NOT_FOUND | 404 |
| Not project member | FORBIDDEN | 403 |
| Label not in project | BAD_REQUEST | 400 |
