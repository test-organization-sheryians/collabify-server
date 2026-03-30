/**
 * Vault — GraphQL Type Definitions Aggregator
 *
 * Collects shared Vault types + extends Query and Mutation with all vault operations.
 * Imported by the module root index.ts and merged into the server schema.
 */

import * as getVaultChildren from "../queries/get-children";
import * as getVaultNode from "../queries/get-node";
import * as getVaultSidebar from "../queries/get-sidebar";
import * as getVaultDownloadUrl from "../queries/get-download-url";
import * as getVaultUsage from "../queries/get-vault-usage";
import * as getVaultAncestors from "../queries/get-ancestors";
import * as getBatchDownloadUrls from "../queries/get-batch-download-urls";

import * as requestVaultUpload from "../services/request-upload";
import * as confirmVaultUpload from "../services/confirm-upload";
import * as registerExternalFile from "../services/register-external-file";
import * as createVaultFolder from "../services/create-folder";
import * as renameVaultFolder from "../services/rename-folder";
import * as deleteVaultFolder from "../services/delete-folder";
import * as moveVaultFolder from "../services/move-folder";
import * as moveVaultFile from "../services/move-file";
import * as renameVaultFile from "../services/rename-file";
import * as deleteVaultFile from "../services/delete-file";
import * as pinVaultFolder from "../services/pin-folder";
import * as unpinVaultFolder from "../services/unpin-folder";
import * as markFilesUnreferenced from "../services/mark-unreferenced";

const sharedTypeDefs = /* GraphQL */ `
  enum VaultNodeType {
    FOLDER
    FILE
  }

  enum VaultSortField {
    NAME
    CREATED_AT
    SIZE
    TYPE
  }

  enum VaultFileSource {
    VAULT
    PAGE
    CHAT
    WHITEBOARD
    TASK
  }

  enum SortDirection {
    ASC
    DESC
  }

  type VaultFolder {
    id: ID!
    projectId: ID!
    parentFolderId: ID
    name: String!
    isSystem: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime
  }

  type VaultFile {
    id: ID!
    workspaceId: ID!
    projectId: ID!
    folderId: ID
    uploaderUserId: ID
    name: String!
    mimeType: String!
    "File size in bytes (Float to safely represent large files >2GB)"
    sizeBytes: Float!
    s3Key: String!
    status: String!
    source: VaultFileSource!
    sourceId: ID
    confirmedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime
    uploader: VaultUploader
  }

  type VaultUploader {
    id: ID!
    fullName: String
    avatarUrl: String
  }

  type VaultChildrenResult {
    folders: [VaultFolder!]!
    files: [VaultFile!]!
    totalFileCount: Int!
    hasNextPage: Boolean!
    nextCursor: ID
  }

  union VaultNode = VaultFolder | VaultFile

  type VaultSidebar {
    pinnedFolders: [VaultFolder!]!
    systemFolders: [VaultFolder!]!
  }

  type VaultDownloadUrl {
    url: String!
    expiresAt: DateTime!
  }

  type VaultUsage {
    projectUsedBytes: Float!
    projectReservedBytes: Float!
    projectLimitBytes: Float!
    projectFileCount: Int!
    projectFileCountLimit: Int!
    workspaceUsedBytes: Float!
    workspaceReservedBytes: Float!
    workspaceLimitBytes: Float!
    workspaceFileCount: Int!
    workspaceFileCountLimit: Int!
    percentUsed: Float!
  }

  "Generic success/id response for delete operations"
  type DeleteResult {
    success: Boolean!
    id: ID!
  }
`;

export const vaultTypeDefs = [
  sharedTypeDefs,
  getVaultChildren.typeDefs,
  getVaultNode.typeDefs,
  getVaultSidebar.typeDefs,
  getVaultDownloadUrl.typeDefs,
  getVaultUsage.typeDefs,
  getVaultAncestors.typeDefs,
  getBatchDownloadUrls.typeDefs,
  requestVaultUpload.typeDefs,
  confirmVaultUpload.typeDefs,
  registerExternalFile.typeDefs,
  createVaultFolder.typeDefs,
  renameVaultFolder.typeDefs,
  deleteVaultFolder.typeDefs,
  moveVaultFolder.typeDefs,
  moveVaultFile.typeDefs,
  renameVaultFile.typeDefs,
  deleteVaultFile.typeDefs,
  pinVaultFolder.typeDefs,
  unpinVaultFolder.typeDefs,
  markFilesUnreferenced.typeDefs,
];
