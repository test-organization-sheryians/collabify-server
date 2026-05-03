-- AddForeignKey
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
