# confirmDescriptionUpload — Service Handler (Phase 2 of 2)

## Overview
**Mutation:** `confirmIssueDescriptionUpload(input: ConfirmDescriptionUploadInput!): ConfirmDescriptionUploadResult!`
Verifies the S3 upload succeeded and activates the description file. Previous ACTIVE files are superseded.

## Flow
```
1. fetchPendingFile       → NOT_FOUND if record missing; CONFLICT if not PENDING
2. fetchIssue             → NOT_FOUND if issue missing/deleted
3. verifyProjectMember    → FORBIDDEN if not member
4. verifyS3Object         → BAD_REQUEST if HeadObject fails (not uploaded)
5. activateFile           → $transaction:
                              updateMany(status=SUPERSEDED) for old ACTIVE files
                              update(status=ACTIVE, sizeBytes, confirmedAt)
                              issue.update(descriptionS3Key)
```

## Invariants
- At most 1 ACTIVE file per issue at any time (enforced by transaction step)
- `issue.descriptionS3Key` always matches the ACTIVE file's `s3Key`
