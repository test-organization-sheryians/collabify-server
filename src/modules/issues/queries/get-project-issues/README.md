# getProjectIssues — Query Handler

## Overview
**Type:** GraphQL Query
**Query:** `getProjectIssues(projectId: String!): [Issue!]!`
Returns all non-deleted issues for a project with full includes (status, assignee, labels).

## Flow
```
1. verifyProjectMember → FORBIDDEN if not member
2. fetchIssues         → SELECT issues WHERE project_id AND deleted_at IS NULL
                          INCLUDE status, assignee, createdBy, labels
```
