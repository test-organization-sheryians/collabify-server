# requestDescriptionUpload — Service Handler (Phase 1 of 2)

## Overview
**Mutation:** `requestIssueDescriptionUpload(input: RequestDescriptionUploadInput!): RequestDescriptionUploadResult!`
Reserves an S3 upload slot and returns a presigned PUT URL. The description is not yet live.

## Flow
```
1. fetchIssue             → NOT_FOUND if missing/deleted (also gets workspaceId)
2. verifyProjectMember    → FORBIDDEN if not member
3. validateSize           → BAD_REQUEST if sizeBytes > 2 MB
4. createPendingFile      → pre-generate UUID → build S3 key → INSERT PENDING row (1 DB write)
5. generatePresignedPut   → return { presignedUrl, descriptionFileId, expiresAt }
```

## Notes
- Does NOT set `issue.descriptionS3Key` — call `confirmIssueDescriptionUpload` after upload
- Presigned URL TTL: 15 minutes
