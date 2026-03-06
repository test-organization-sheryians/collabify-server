import type { VaultFolder, VaultFile, User } from "@prisma/client";

export type FolderRow = VaultFolder;

export type FileRow = VaultFile & {
  uploader: Pick<User, "id" | "fullName" | "avatarUrl"> | null;
};

export interface VaultChildrenResult {
  folders: FolderRow[];
  files: FileRow[];
  totalFileCount: number;
  hasNextPage: boolean;
  nextCursor: string | null;
}
