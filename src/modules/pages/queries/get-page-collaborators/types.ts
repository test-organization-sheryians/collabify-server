/**
 * Types for get-page-collaborators query.
 *
 * We use Prisma's inferred type directly instead of a custom interface to avoid
 * structural mismatch between our type and the mapper's parameter type
 * (toGraphQLPageCollaborator expects PrismaPageCollaborator & { user: ... }).
 */
import type { PageCollaborator as PrismaPageCollaborator } from "@prisma/client";

/** Collaborator row with joined user profile — direct Prisma inference shape. */
export type CollaboratorWithUser = PrismaPageCollaborator & {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
};

export interface GetPageCollaboratorsResult {
  collaborators: CollaboratorWithUser[];
}
