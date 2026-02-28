-- CreateIndex: Chat conversation project-type lookup (supports project-scoped queries)
CREATE INDEX IF NOT EXISTS "idx_chat_conversation_project_type" 
ON "chat_conversations"("project_id", "type", "workspace_id");

-- CreateIndex: Project member validation (used by create-dm and create-group)
CREATE INDEX IF NOT EXISTS "idx_project_member_lookup" 
ON "project_members"("project_id", "user_id");

-- CreateIndex: Chat member user-conversation lookup (used by queries)
CREATE INDEX IF NOT EXISTS "idx_chat_member_user_conversation" 
ON "chat_members"("user_id", "conversation_id");

-- CreateIndex: Chat member conversation-user reverse lookup
CREATE INDEX IF NOT EXISTS "idx_chat_member_conversation_user" 
ON "chat_members"("conversation_id", "user_id");