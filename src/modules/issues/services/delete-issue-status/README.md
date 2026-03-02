# deleteIssueStatus — Service Handler

## Overview
**Mutation:** `deleteIssueStatus(input: DeleteIssueStatusInput!): DeleteIssueStatusResult!`
Soft-deletes a Kanban column. Guards prevent deletion of system statuses or non-empty columns.

## Flow
```
1. fetchStatus          → NOT_FOUND if missing/deleted
2. guardSystemStatus    → FORBIDDEN if isSystem = true
3. verifyProjectMember  → FORBIDDEN if not member
4. guardNonEmptyColumn  → CONFLICT if column has active issues
5. softDeleteStatus     → UPDATE issue_statuses SET deleted_at = now()
```

## Failure Modes

| Trigger | Error |
|---------|-------|
| Status not found | NOT_FOUND |
| System status | FORBIDDEN |
| Not project member | FORBIDDEN |
| Column has active issues | CONFLICT |
