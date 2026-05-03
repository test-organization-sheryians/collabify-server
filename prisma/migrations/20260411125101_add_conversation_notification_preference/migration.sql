-- CreateEnum
CREATE TYPE "ConversationNotifMode" AS ENUM ('ALL_MESSAGES', 'MENTIONS_ONLY', 'NOTHING');

-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "mute_until" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "conversation_notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "mode" "ConversationNotifMode" NOT NULL DEFAULT 'ALL_MESSAGES',
    "mute_until" TIMESTAMP(3),
    "push_enabled" BOOLEAN,
    "email_enabled" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_notification_preferences_user_id_idx" ON "conversation_notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_conv_notif_pref" ON "conversation_notification_preferences"("user_id", "conversation_id");

-- CreateIndex
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "conversation_notification_preferences" ADD CONSTRAINT "conversation_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_notification_preferences" ADD CONSTRAINT "conversation_notification_preferences_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
