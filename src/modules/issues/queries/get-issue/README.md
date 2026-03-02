# getIssue — Query Handler

## Overview
**Type:** GraphQL Query
**Query:** `getIssue(issueId: String!): Issue!`
Returns a single issue with full includes.

## Flow
```
1. fetchIssue          → NOT_FOUND if missing/deleted; includes projectId for auth
2. verifyProjectMember → FORBIDDEN if not member
```
