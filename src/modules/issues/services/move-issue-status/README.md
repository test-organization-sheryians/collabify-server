# moveIssueStatus — Service Handler

## Overview

**Type:** GraphQL Mutation
**Mutation:** `moveIssueStatus(input: MoveIssueStatusInput!): MoveIssueStatusResult!`

Moves an issue to a different status column (kanban drag-and-drop). Updates both `statusId` and `position`.

## Flow

```
1. fetchIssue           → NOT_FOUND if missing/deleted
2. verifyProjectMember  → FORBIDDEN if not member
3. validateStatus       → NOT_FOUND if target statusId not in project
4. moveIssue            → UPDATE issues SET status_id, position
```

## Failure Modes

| Trigger | Error | Client Impact |
|---------|-------|--------------|
| Issue not found | NOT_FOUND | 404 |
| Not project member | FORBIDDEN | 403 |
| Target status not in project | NOT_FOUND | 404 |
