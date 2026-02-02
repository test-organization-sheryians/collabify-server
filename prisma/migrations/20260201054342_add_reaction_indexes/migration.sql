-- CreateIndex
CREATE INDEX "message_reactions_message_id_created_at_idx" ON "message_reactions"("message_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "message_reactions_user_id_created_at_idx" ON "message_reactions"("user_id", "created_at" DESC);
