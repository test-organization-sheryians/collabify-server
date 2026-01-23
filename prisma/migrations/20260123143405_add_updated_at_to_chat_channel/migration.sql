/*
  Warnings:

  - Added the required column `updated_at` to the `chat_channels` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- 1. Add column as nullable
ALTER TABLE "chat_channels" ADD COLUMN "updated_at" TIMESTAMP(3);

-- 2. Backfill existing rows with created_at value
UPDATE "chat_channels" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;

-- 3. Add NOT NULL constraint
ALTER TABLE "chat_channels" ALTER COLUMN "updated_at" SET NOT NULL;
