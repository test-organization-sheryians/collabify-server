# getIssueDescriptionUrl — Query Handler

## Overview
**Type:** GraphQL Query
**Query:** `getIssueDescriptionUrl(issueId: String!): IssueDescriptionUrl!`
Returns a short-lived presigned S3 GET URL for the issue's current description.

## Flow
```
1. fetchIssueForDescription → lean select: id, projectId, descriptionS3Key
2. verifyProjectMember      → FORBIDDEN if not member
3. generatePresignedGet     → NOT_FOUND if descriptionS3Key is null (never saved)
                               Otherwise return { url, expiresAt } (TTL: 60 min)
```

## Notes
- Does NOT read `IssueDescriptionFile` table — uses `issue.descriptionS3Key` as truth
- Returns NOT_FOUND (not an empty URL) if description was never saved
