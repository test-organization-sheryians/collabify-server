/*
  Warnings:

  - A unique constraint covering the columns `[workspace_id,project_id,name]` on the table `roles` will be added. If there are existing duplicate values, this will fail.
  - Made the column `workspace_id` on table `roles` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "roles_workspace_id_name_key";

-- AlterTable
-- Purge legacy system-template roles that have no workspace (workspace_id IS NULL).
-- These were placeholder rows from an older design; no WorkspaceMember/ProjectMember
-- can legitimately reference them (those tables also require workspace_id to resolve).
DELETE FROM "roles" WHERE "workspace_id" IS NULL;
ALTER TABLE "roles" ADD COLUMN     "project_id" TEXT,
ALTER COLUMN "workspace_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "roles_project_id_idx" ON "roles"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_workspace_id_project_id_name_key" ON "roles"("workspace_id", "project_id", "name");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
