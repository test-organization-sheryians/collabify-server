# createIssueStatus — Service Handler

## Overview
**Mutation:** `createIssueStatus(input: CreateIssueStatusInput!): CreateIssueStatusResult!`
Creates a new custom Kanban column for a project, appended after the last existing column.

## Flow
```
1. verifyProjectMember → FORBIDDEN if not member
2. insertStatus        → compute append position + CREATE issue_statuses row
```
