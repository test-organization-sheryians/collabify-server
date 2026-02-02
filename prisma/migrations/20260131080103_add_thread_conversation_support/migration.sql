/*
  Warnings:

  - A unique constraint covering the columns `[parent_message_id]` on the table `chat_conversations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "chat_conversations" ADD COLUMN     "parent_conversation_id" TEXT,
ADD COLUMN     "parent_message_id" TEXT;

-- CreateIndex
CREATE INDEX "chat_conversations_parent_conversation_id_idx" ON "chat_conversations"("parent_conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversations_parent_message_id_key" ON "chat_conversations"("parent_message_id");

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_parent_conversation_id_fkey" FOREIGN KEY ("parent_conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
