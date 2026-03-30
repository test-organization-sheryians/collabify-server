-- AlterTable
ALTER TABLE "vault_files" ADD COLUMN     "unref_at" TIMESTAMP(3),
ADD COLUMN     "unref_entity_id" TEXT,
ADD COLUMN     "unref_entity_type" "VaultFileSource";

-- CreateIndex
CREATE INDEX "vault_files_status_unref_at_idx" ON "vault_files"("status", "unref_at");
