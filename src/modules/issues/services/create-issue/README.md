# createIssue — Service Handler

## Overview

**Type:** GraphQL Mutation
**Path:** `services/create-issue`
**Mutation:** `createIssue(input: CreateIssueInput!): CreateIssueResult!`

Creates a new issue in a project column with an atomic sequential number assignment.

## Input / Output

| Field | Type | Description |
|-------|------|-------------|
| projectId | String | Target project |
| title | String | Issue title |
| statusId | String | Target column (IssueStatus) |
| priority | IssuePriority | LOW / MEDIUM / HIGH / URGENT / NO_PRIORITY |
| assigneeId | String? | Assigned user |
| dueDate | DateTime? | Due date |
| labelIds | [String] | Labels to attach |

**Returns:** `{ issue: Issue }`

## Flow

```
1. verifyProjectMember  → FORBIDDEN if not member
2. validateStatus       → NOT_FOUND if statusId not in project
3. validateLabels       → BAD_REQUEST if any labelId not in project
4. insertIssue          → $transaction: getNextIssueNumber (SELECT MAX FOR UPDATE)
                                      + compute append position
                                      + issue.create + labels.createMany
```

## Failure Modes

| Trigger | Error | Client Impact |
|---------|-------|--------------|
| Not project member | FORBIDDEN | 403 |
| Status not in project | NOT_FOUND | 404 |
| Label not in project | BAD_REQUEST | 400 |
| DB constraint violation | Internal | 500 |
