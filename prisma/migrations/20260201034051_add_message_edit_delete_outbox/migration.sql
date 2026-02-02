-- CreateTable
CREATE TABLE "message_edit_outbox" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "edited_by" TEXT NOT NULL,
    "edited_at" TIMESTAMP(3) NOT NULL,
    "nonce" TEXT NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "message_edit_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_delete_outbox" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "deleted_by" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL,
    "nonce" TEXT NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "message_delete_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_edit_outbox_status_created_at_idx" ON "message_edit_outbox"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "message_edit_outbox_message_id_nonce_key" ON "message_edit_outbox"("message_id", "nonce");

-- CreateIndex
CREATE INDEX "message_delete_outbox_status_created_at_idx" ON "message_delete_outbox"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "message_delete_outbox_message_id_nonce_key" ON "message_delete_outbox"("message_id", "nonce");
