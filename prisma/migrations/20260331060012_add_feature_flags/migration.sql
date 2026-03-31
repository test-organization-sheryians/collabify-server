-- CreateEnum
CREATE TYPE "FlagContextType" AS ENUM ('GLOBAL', 'WORKSPACE', 'PROJECT', 'USER');

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "default_enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_overrides" (
    "id" TEXT NOT NULL,
    "flag_id" TEXT NOT NULL,
    "context_type" "FlagContextType" NOT NULL,
    "context_id" TEXT,
    "enabled" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flag_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flag_overrides_flag_id_idx" ON "feature_flag_overrides"("flag_id");

-- CreateIndex
CREATE INDEX "feature_flag_overrides_context_id_idx" ON "feature_flag_overrides"("context_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_overrides_flag_id_context_type_context_id_key" ON "feature_flag_overrides"("flag_id", "context_type", "context_id");

-- AddForeignKey
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_flag_id_fkey" FOREIGN KEY ("flag_id") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
