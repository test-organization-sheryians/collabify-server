# add-page-collaborators — Service Handler

## Overview

Adds or updates collaborators on a page. Uses upsert semantics — if a user is already a collaborator, their role is updated rather than throwing a duplicate error. Validates that all target users exist before any DB writes.

**Access:** EDITOR role only  
**Semantics:** Upsert (insert + role update in one call)

---

## Folder Structure

```
add-page-collaborators/
├── handler.ts   — 3-step orchestrator
├── schema.ts    — input validation (pageId, collaborators: [{userId, role}][])
└── index.ts     — re-export
```

---

## Execution Flow

```
addPageCollaborators(pageId, collaborators: [{userId, role}])
    │
    ├─ 1. Auth + EDITOR check
    │    page.findUnique({ id: pageId, deletedAt: null })
    │    pageCollaborator.findUnique({ pageId, userId: callerId })
    │    → FORBIDDEN if caller is not EDITOR
    │
    ├─ 2. Validate all target users exist
    │    user.findMany({ where: { id: { in: targetIds } } })
    │    missing = targetIds.filter(id => !foundIds.has(id))
    │    → NOT_FOUND if any targetId not in DB
    │
    └─ 3. Upsert in parallel (Promise.all)
         pageCollaborator.upsert({
           where: { pageId_userId: { pageId, userId: c.userId } },
           create: { pageId, userId, role },
           update: { role },             ← update role if already collaborator
           include: { user: { select: { id, fullName, email, avatarUrl } } }
         })
         → returns [{ ...collaborator, user }]
```

---

## Design Notes

- **Upsert vs createMany:** `createMany` does not support returning created records in Prisma. `upsert` in a parallel loop is used instead of `createMany` + `updateMany` because it handles both create and role-update in one call per collaborator.
- **No notification:** Adding a collaborator does NOT currently send an email or in-app notification. This is a planned future improvement.
- **No self-invite guard:** A user can be invited to a page they already have access to (upsert handles it). Adding yourself is also allowed — it just updates your own role.
- **Role validation:** Role is validated in `schema.ts` against the `Role` enum. Invalid roles are rejected before the handler runs.

---

## Error Codes

| Condition                         | Error          |
| --------------------------------- | -------------- |
| Not authenticated                 | `UNAUTHORIZED` |
| Page not found / deleted          | `NOT_FOUND`    |
| Caller is not EDITOR              | `FORBIDDEN`    |
| Any target userId not found in DB | `NOT_FOUND`    |
