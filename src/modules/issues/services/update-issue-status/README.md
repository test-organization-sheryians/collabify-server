# updateIssueStatus — Service Handler

## Overview
**Mutation:** `updateIssueStatus(input: UpdateIssueStatusInput!): UpdateIssueStatusResult!`
Patches mutable fields (name, color, icon) of a Kanban column. System statuses can be renamed.

## Flow
```
1. fetchStatus         → NOT_FOUND if missing/deleted
2. verifyProjectMember → FORBIDDEN if not member
3. patchStatus         → UPDATE issue_statuses SET name/color/icon
```
