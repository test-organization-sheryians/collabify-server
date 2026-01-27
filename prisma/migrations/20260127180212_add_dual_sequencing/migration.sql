/*
  Warnings:

  - A unique constraint covering the columns `[conversation_id,sequence]` on the table `chat_messages` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sequence` to the `chat_messages` table without a default value. This is not possible if the table is not empty.

*/

-- 1. Add columns (Nullable for sequence initially)
ALTER TABLE "chat_conversations" ADD COLUMN "last_sequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "chat_messages" ADD COLUMN "sequence" INTEGER; -- Initially nullable for backfill

-- 2. Backfill Sequences (Window Function)
WITH calculated_seqs AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at ASC) as seq
  FROM "chat_messages"
)
UPDATE "chat_messages" m
SET sequence = c.seq
FROM calculated_seqs c
WHERE m.id = c.id;

-- 3. Backfill Last Sequence on Conversations
UPDATE "chat_conversations" c
SET last_sequence = COALESCE((
  SELECT MAX(sequence) 
  FROM "chat_messages" m 
  WHERE m.conversation_id = c.id
), 0);

-- 4. Enforce Context
ALTER TABLE "chat_messages" ALTER COLUMN "sequence" SET NOT NULL;

-- 5. Create Index
CREATE UNIQUE INDEX "chat_messages_conversation_id_sequence_key" ON "chat_messages"("conversation_id", "sequence");

