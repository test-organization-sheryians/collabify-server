/*
  Warnings:

  - Added the required column `updated_at` to the `vault_files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `vault_folders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VaultFileStatus" AS ENUM ('PENDING', 'ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "VaultFileSource" AS ENUM ('VAULT', 'PAGE', 'CHAT', 'WHITEBOARD', 'TASK');

-- CreateEnum
CREATE TYPE "VaultUsageRecordScope" AS ENUM ('PROJECT', 'WORKSPACE');

-- DropIndex
DROP INDEX "vault_files_project_id_folder_id_idx";

-- AlterTable
ALTER TABLE "vault_files" ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "source" "VaultFileSource" NOT NULL DEFAULT 'VAULT',
ADD COLUMN     "source_id" TEXT,
ADD COLUMN     "status" "VaultFileStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "size_bytes" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "vault_folders" ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "vault_usage_records" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "project_id" TEXT,
    "scope" "VaultUsageRecordScope" NOT NULL,
    "used_bytes" BIGINT NOT NULL DEFAULT 0,
    "reserved_bytes" BIGINT NOT NULL DEFAULT 0,
    "file_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vault_usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vault_pinned_folders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "folder_id" TEXT NOT NULL,
    "pinned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vault_pinned_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vault_usage_records_workspace_id_scope_idx" ON "vault_usage_records"("workspace_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "vault_usage_records_workspace_id_project_id_scope_key" ON "vault_usage_records"("workspace_id", "project_id", "scope");

-- CreateIndex
CREATE INDEX "vault_pinned_folders_user_id_project_id_idx" ON "vault_pinned_folders"("user_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "vault_pinned_folders_user_id_folder_id_key" ON "vault_pinned_folders"("user_id", "folder_id");

-- CreateIndex
CREATE INDEX "vault_files_project_id_folder_id_status_idx" ON "vault_files"("project_id", "folder_id", "status");

-- CreateIndex
CREATE INDEX "vault_files_project_id_source_idx" ON "vault_files"("project_id", "source");

-- CreateIndex
CREATE INDEX "vault_files_status_created_at_idx" ON "vault_files"("status", "created_at");

-- CreateIndex
CREATE INDEX "vault_files_workspace_id_status_idx" ON "vault_files"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "vault_folders_project_id_parent_folder_id_idx" ON "vault_folders"("project_id", "parent_folder_id");

-- CreateIndex
CREATE INDEX "vault_folders_project_id_is_system_idx" ON "vault_folders"("project_id", "is_system");

-- AddForeignKey
ALTER TABLE "vault_usage_records" ADD CONSTRAINT "vault_usage_records_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_usage_records" ADD CONSTRAINT "vault_usage_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_pinned_folders" ADD CONSTRAINT "vault_pinned_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_pinned_folders" ADD CONSTRAINT "vault_pinned_folders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_pinned_folders" ADD CONSTRAINT "vault_pinned_folders_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "vault_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
