/*
  Warnings:

  - You are about to drop the column `custom_role_id` on the `workspace_members` table. All the data in the column will be lost.
  - You are about to drop the `custom_roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `system_permissions` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "RoleScopeType" AS ENUM ('WORKSPACE', 'PROJECT');

-- CreateEnum
CREATE TYPE "PrincipalType" AS ENUM ('USER', 'ROLE', 'ALL');

-- AlterEnum
ALTER TYPE "RoleType" ADD VALUE 'ADMIN';

-- DropForeignKey
ALTER TABLE "custom_roles" DROP CONSTRAINT "custom_roles_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "project_members" DROP CONSTRAINT "project_members_project_role_id_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_role_id_fkey";

-- DropForeignKey
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_custom_role_id_fkey";

-- AlterTable
ALTER TABLE "resource_policies" ADD COLUMN     "conditions" JSONB,
ADD COLUMN     "principal_type" "PrincipalType" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "role_permissions" ADD COLUMN     "conditions" JSONB,
ADD COLUMN     "effect" "PolicyEffect" NOT NULL DEFAULT 'ALLOW';

-- AlterTable
ALTER TABLE "workspace_members" DROP COLUMN "custom_role_id",
ADD COLUMN     "role_id" TEXT;

-- DropTable
DROP TABLE "custom_roles";

-- DropTable
DROP TABLE "system_permissions";

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL DEFAULT '',
    "has_conditions" BOOLEAN NOT NULL DEFAULT false,
    "is_deprecated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope_type" "RoleScopeType" NOT NULL DEFAULT 'WORKSPACE',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "rank" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "permissions_resource_idx" ON "permissions"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "roles_workspace_id_idx" ON "roles"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_workspace_id_name_key" ON "roles"("workspace_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_id_workspace_id_key" ON "roles"("id", "workspace_id");

-- CreateIndex
CREATE INDEX "workspace_members_role_id_idx" ON "workspace_members"("role_id");

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_policies" ADD CONSTRAINT "resource_policies_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_role_id_workspace_id_fkey" FOREIGN KEY ("project_role_id", "workspace_id") REFERENCES "roles"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;
