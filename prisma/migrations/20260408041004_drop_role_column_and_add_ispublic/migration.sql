/*
  Warnings:

  - You are about to drop the column `role` on the `chat_members` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chat_conversations" ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "chat_members" DROP COLUMN "role";
