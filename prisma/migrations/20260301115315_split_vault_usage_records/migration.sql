/*
  Warnings:

  - You are about to drop the `vault_usage_records` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "vault_usage_records" DROP CONSTRAINT "vault_usage_records_project_id_fkey";

-- DropForeignKey
ALTER TABLE "vault_usage_records" DROP CONSTRAINT "vault_usage_records_workspace_id_fkey";

-- DropTable
DROP TABLE "vault_usage_records";

-- DropEnum
DROP TYPE "VaultUsageRecordScope";

-- CreateTable
CREATE TABLE "vault_project_usage" (
    "workspace_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "used_bytes" BIGINT NOT NULL DEFAULT 0,
    "reserved_bytes" BIGINT NOT NULL DEFAULT 0,
    "file_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vault_project_usage_pkey" PRIMARY KEY ("workspace_id","project_id")
);

-- CreateTable
CREATE TABLE "vault_workspace_usage" (
    "workspace_id" TEXT NOT NULL,
    "used_bytes" BIGINT NOT NULL DEFAULT 0,
    "reserved_bytes" BIGINT NOT NULL DEFAULT 0,
    "file_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "vault_workspace_usage_workspace_id_key" ON "vault_workspace_usage"("workspace_id");

-- AddForeignKey
ALTER TABLE "vault_project_usage" ADD CONSTRAINT "vault_project_usage_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_project_usage" ADD CONSTRAINT "vault_project_usage_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_workspace_usage" ADD CONSTRAINT "vault_workspace_usage_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
