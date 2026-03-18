# reorderIssueStatus — Service Handler

## Overview
**Mutation:** `reorderIssueStatus(input: ReorderIssueStatusInput!): ReorderIssueStatusResult!`
Sets the fractional position of a Kanban column (column drag left/right).

## Flow
```
1. fetchStatus         → NOT_FOUND if missing/deleted
2. verifyProjectMember → FORBIDDEN if not member
3. updatePosition      → UPDATE issue_statuses SET position = newPosition
```
