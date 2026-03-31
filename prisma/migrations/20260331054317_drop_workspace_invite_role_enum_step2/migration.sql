/*
  Warnings:

  - You are about to drop the column `role` on the `workspace_invites` table. All the data in the column will be lost.
  - Made the column `role_id` on table `workspace_invites` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "workspace_invites" DROP CONSTRAINT "workspace_invites_role_id_fkey";

-- AlterTable
ALTER TABLE "workspace_invites" DROP COLUMN "role",
ALTER COLUMN "role_id" SET NOT NULL;

-- DropEnum
DROP TYPE "RoleType";

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
