/*
  Warnings:

  - You are about to drop the column `chatMessageId` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `pageId` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `taskId` on the `notifications` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_chatMessageId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_pageId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_taskId_fkey";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "chatMessageId",
DROP COLUMN "pageId",
DROP COLUMN "taskId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
