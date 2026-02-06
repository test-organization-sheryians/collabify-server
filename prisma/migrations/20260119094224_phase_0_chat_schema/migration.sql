/*
  Warnings:

  - You are about to drop the column `attachmentIds` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `is_system` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `sender_user_id` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `chat_messages` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[channel_id,stream_id]` on the table `chat_messages` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `author_user_id` to the `chat_messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stream_id` to the `chat_messages` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `content` on the `chat_messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_sender_user_id_fkey";

-- DropIndex
DROP INDEX "chat_messages_channel_id_created_at_idx";

-- AlterTable
ALTER TABLE "chat_members" ADD COLUMN     "is_muted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_delivered_msg_id" TEXT,
ADD COLUMN     "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "attachmentIds",
DROP COLUMN "is_system",
DROP COLUMN "sender_user_id",
DROP COLUMN "updated_at",
ADD COLUMN     "author_user_id" TEXT NOT NULL,
ADD COLUMN     "edited_at" TIMESTAMP(3),
ADD COLUMN     "is_edited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "parent_message_id" TEXT,
ADD COLUMN     "reply_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stream_id" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'TEXT',
DROP COLUMN "content",
ADD COLUMN     "content" JSONB NOT NULL;

-- CreateTable
CREATE TABLE "chat_outbox_messages" (
    "id" BIGSERIAL NOT NULL,
    "message_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "error_log" JSONB,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "chat_outbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_outbox_messages_message_id_key" ON "chat_outbox_messages"("message_id");

-- CreateIndex
CREATE INDEX "chat_outbox_messages_status_created_at_idx" ON "chat_outbox_messages"("status", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_channel_id_created_at_idx" ON "chat_messages"("channel_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "chat_messages_parent_message_id_created_at_idx" ON "chat_messages"("parent_message_id", "created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_channel_id_stream_id_key" ON "chat_messages"("channel_id", "stream_id");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
