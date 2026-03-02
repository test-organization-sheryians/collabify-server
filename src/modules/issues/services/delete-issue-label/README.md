# deleteIssueLabel — Service Handler

## Overview
**Mutation:** `deleteIssueLabel(input: DeleteIssueLabelInput!): DeleteIssueLabelResult!`
Soft-deletes a label. IssueToLabel join rows cascade via DB FK.

## Flow
```
1. fetchLabel          → NOT_FOUND if missing/deleted
2. verifyProjectMember → FORBIDDEN if not member
3. softDeleteLabel     → UPDATE issue_labels SET deleted_at = now()
```
