# getIssueStatuses — Query Handler

## Overview
**Type:** GraphQL Query
**Query:** `getIssueStatuses(projectId: String!): [IssueStatus!]!`
Returns all non-deleted Kanban columns for a project, ordered by position.

## Flow
```
1. verifyProjectMember → FORBIDDEN if not member
2. fetchStatuses       → SELECT issue_statuses WHERE project_id ORDER BY position
```
