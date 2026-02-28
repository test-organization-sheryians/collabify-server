/**
 * Types for add-page-collaborators service.
 */
import type { PageCollaborator as PrismaPageCollaborator } from "@prisma/client";

/** Upserted collaborator with joined user profile (returned to the resolver). */
export type UpsertedCollaborator = PrismaPageCollaborator & {
  user: {
    id: string;
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
  };
};

export interface AddPageCollaboratorsResult {
  addedCollaborators: UpsertedCollaborator[];
}
