/*
  Warnings:

  - You are about to drop the column `role` on the `workspace_members` table. All the data in the column will be lost.
  - Made the column `role_id` on table `workspace_members` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_role_id_fkey";

-- AlterTable
ALTER TABLE "workspace_members" DROP COLUMN "role",
ALTER COLUMN "role_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
