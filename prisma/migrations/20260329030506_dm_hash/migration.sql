/*
  Warnings:

  - A unique constraint covering the columns `[dm_hash]` on the table `chat_conversations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "chat_conversations" ADD COLUMN     "dm_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversations_dm_hash_key" ON "chat_conversations"("dm_hash");
