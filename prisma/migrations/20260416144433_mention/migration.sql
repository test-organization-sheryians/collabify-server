-- CreateEnum
CREATE TYPE "MentionTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "MentionStatus" AS ENUM ('ACTIVE', 'ORPHANED', 'REMOVED');

-- CreateTable
CREATE TABLE "mentions" (
    "id" TEXT NOT NULL,
    "source_entity_id" TEXT NOT NULL,
    "source_entity_type" TEXT NOT NULL,
    "target_entity_id" TEXT NOT NULL,
    "target_entity_type" TEXT NOT NULL,
    "display_text" TEXT NOT NULL,
    "source_location" JSONB,
    "tier" "MentionTier" NOT NULL DEFAULT 'TIER_2',
    "status" "MentionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backlinks" (
    "id" TEXT NOT NULL,
    "source_entity_id" TEXT NOT NULL,
    "source_entity_type" TEXT NOT NULL,
    "target_entity_id" TEXT NOT NULL,
    "target_entity_type" TEXT NOT NULL,
    "mention_id" TEXT NOT NULL,
    "context" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backlinks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mention_events" (
    "id" TEXT NOT NULL,
    "mention_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mention_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mentions_source_entity_id_status_idx" ON "mentions"("source_entity_id", "status");

-- CreateIndex
CREATE INDEX "mentions_target_entity_id_status_idx" ON "mentions"("target_entity_id", "status");

-- CreateIndex
CREATE INDEX "mentions_created_by_id_idx" ON "mentions"("created_by_id");

-- CreateIndex
CREATE INDEX "backlinks_target_entity_id_idx" ON "backlinks"("target_entity_id");

-- CreateIndex
CREATE INDEX "backlinks_source_entity_id_idx" ON "backlinks"("source_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "backlinks_source_entity_id_target_entity_id_key" ON "backlinks"("source_entity_id", "target_entity_id");

-- CreateIndex
CREATE INDEX "mention_events_mention_id_idx" ON "mention_events"("mention_id");

-- CreateIndex
CREATE INDEX "mention_events_created_at_idx" ON "mention_events"("created_at");

-- AddForeignKey
ALTER TABLE "backlinks" ADD CONSTRAINT "backlinks_mention_id_fkey" FOREIGN KEY ("mention_id") REFERENCES "mentions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
