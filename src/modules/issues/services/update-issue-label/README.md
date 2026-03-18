# updateIssueLabel — Service Handler

## Overview
**Mutation:** `updateIssueLabel(input: UpdateIssueLabelInput!): UpdateIssueLabelResult!`
Patches mutable label fields (name, color).

## Flow
```
1. fetchLabel          → NOT_FOUND if missing/deleted
2. verifyProjectMember → FORBIDDEN if not member
3. patchLabel          → UPDATE issue_labels SET name/color
```
