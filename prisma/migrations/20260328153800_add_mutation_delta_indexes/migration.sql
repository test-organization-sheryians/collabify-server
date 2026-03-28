-- Migration: add_mutation_delta_indexes
-- Adds composite indexes on chat_messages for efficient mutation delta queries.
-- These power the offline gap sync: on chat:subscribe-conversation, the server
-- queries messages deleted/edited since the client's lastOpenedAt timestamp.
-- Without these indexes, the query would be a full table scan on chat_messages.

CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_deleted_at_idx"
  ON "chat_messages"("conversation_id", "deleted_at");

CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_edited_at_idx"
  ON "chat_messages"("conversation_id", "edited_at");
