/*
  Warnings:

  - You are about to drop the column `channel_id` on the `chat_members` table. All the data in the column will be lost.
  - You are about to drop the column `channel_id` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `channel_id` on the `chat_outbox_messages` table. All the data in the column will be lost.
  - You are about to drop the `chat_channels` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[conversation_id,user_id]` on the table `chat_members` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[conversation_id,stream_id]` on the table `chat_messages` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[conversation_id,message_id]` on the table `chat_outbox_messages` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `conversation_id` to the `chat_members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conversation_id` to the `chat_messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conversation_id` to the `chat_outbox_messages` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('CHANNEL', 'DM', 'GROUP_DM', 'THREAD');

-- DropForeignKey
ALTER TABLE "chat_channels" DROP CONSTRAINT "chat_channels_project_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_channels" DROP CONSTRAINT "chat_channels_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_members" DROP CONSTRAINT "chat_members_channel_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_channel_id_fkey";

-- DropIndex
DROP INDEX "chat_members_channel_id_user_id_key";

-- DropIndex
DROP INDEX "chat_messages_channel_id_created_at_idx";

-- DropIndex
DROP INDEX "chat_messages_channel_id_stream_id_key";

-- AlterTable
ALTER TABLE "chat_members" DROP COLUMN "channel_id",
ADD COLUMN     "conversation_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "channel_id",
ADD COLUMN     "conversation_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "chat_outbox_messages" DROP COLUMN "channel_id",
ADD COLUMN     "conversation_id" TEXT NOT NULL,
ADD COLUMN     "conversation_type" "ConversationType" NOT NULL DEFAULT 'CHANNEL';

-- DropTable
DROP TABLE "chat_channels";

-- DropEnum
DROP TYPE "ChannelType";

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "project_id" TEXT,
    "type" "ConversationType" NOT NULL DEFAULT 'CHANNEL',
    "name" TEXT,
    "topic" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversations_project_id_name_key" ON "chat_conversations"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "chat_members_conversation_id_user_id_key" ON "chat_members"("conversation_id", "user_id");

-- CreateIndex
CREATE INDEX "chat_messages_conversation_id_created_at_idx" ON "chat_messages"("conversation_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_conversation_id_stream_id_key" ON "chat_messages"("conversation_id", "stream_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_outbox_messages_conversation_id_message_id_key" ON "chat_outbox_messages"("conversation_id", "message_id");

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
