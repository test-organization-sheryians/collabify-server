# getIssueLabels — Query Handler

## Overview
**Type:** GraphQL Query
**Query:** `getIssueLabels(projectId: String!): [IssueLabel!]!`
Returns all non-deleted labels for a project.

## Flow
```
1. verifyProjectMember → FORBIDDEN if not member
2. fetchLabels         → SELECT issue_labels WHERE project_id AND deleted_at IS NULL
```
