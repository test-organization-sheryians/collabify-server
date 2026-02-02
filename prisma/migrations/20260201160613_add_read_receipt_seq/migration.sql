-- AlterTable
ALTER TABLE "chat_members" ADD COLUMN     "last_read_seq" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "chat_members_last_read_seq_idx" ON "chat_members"("last_read_seq");
