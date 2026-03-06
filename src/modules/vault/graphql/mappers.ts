/**
 * Vault — Prisma to GraphQL Mappers
 *
 * Converts Prisma row types to GraphQL-safe types.
 * Main concern: BigInt (Prisma) → Float (GraphQL scalar) for byte values.
 * GraphQL has no Int64, and JS bitwise ops can't handle >53 bit ints anyway.
 * Float gives ~15 significant digits which covers petabyte-level values safely.
 */

import type { VaultFolder, VaultFile, User } from "@prisma/client";
import type { VaultFileSource } from "@/graphql/generated";

// ── Folder ─────────────────────────────────────────────────────────────────────

export type GraphQLVaultFolder = ReturnType<typeof toGraphQLFolder>;

export function toGraphQLFolder(folder: VaultFolder) {
  return {
    ...folder,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
    deletedAt: folder.deletedAt?.toISOString() ?? null,
  };
}

// ── File ───────────────────────────────────────────────────────────────────────

type FileWithUploader = VaultFile & {
  uploader?: Pick<User, "id" | "fullName" | "avatarUrl"> | null;
};

export type GraphQLVaultFile = ReturnType<typeof toGraphQLFile>;

export function toGraphQLFile(file: FileWithUploader) {
  return {
    ...file,
    sizeBytes: Number(file.sizeBytes), // BigInt → Float
    // Cast Prisma enum → generated GraphQL enum (same string values, different type identity)
    source: file.source as unknown as VaultFileSource,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
    confirmedAt: file.confirmedAt?.toISOString() ?? null,
    deletedAt: file.deletedAt?.toISOString() ?? null,
  };
}

// ── Usage ──────────────────────────────────────────────────────────────────────

export function toGraphQLUsage(usage: {
  projectUsedBytes: bigint;
  projectReservedBytes: bigint;
  projectLimitBytes: bigint;
  projectFileCount: number;
  projectFileCountLimit: number;
  workspaceUsedBytes: bigint;
  workspaceReservedBytes: bigint;
  workspaceLimitBytes: bigint;
  workspaceFileCount: number;
  workspaceFileCountLimit: number;
  percentUsed: number;
}) {
  return {
    ...usage,
    projectUsedBytes: Number(usage.projectUsedBytes),
    projectReservedBytes: Number(usage.projectReservedBytes),
    projectLimitBytes: Number(usage.projectLimitBytes),
    workspaceUsedBytes: Number(usage.workspaceUsedBytes),
    workspaceReservedBytes: Number(usage.workspaceReservedBytes),
    workspaceLimitBytes: Number(usage.workspaceLimitBytes),
  };
}
