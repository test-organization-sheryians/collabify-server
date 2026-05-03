import type { VaultFolder, VaultFile, User } from "@prisma/client";

export type FolderNode = VaultFolder & {
  childFolderCount: number;
  fileCount: number;
};

export type FileNode = VaultFile & {
  uploader: Pick<User, "id" | "fullName" | "avatarUrl"> | null;
};

export type VaultNode = FolderNode | FileNode;
