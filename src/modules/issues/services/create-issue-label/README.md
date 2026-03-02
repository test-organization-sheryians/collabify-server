# createIssueLabel — Service Handler

## Overview
**Mutation:** `createIssueLabel(input: CreateIssueLabelInput!): CreateIssueLabelResult!`
Creates a project-scoped label. Names are unique per project (case-sensitive).

## Flow
```
1. verifyProjectMember → FORBIDDEN if not member
2. checkDuplicateName  → CONFLICT if label name already exists
3. insertLabel         → CREATE issue_labels row
```
