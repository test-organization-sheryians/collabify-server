/*
  Warnings:

  - You are about to drop the column `content_s3_key` on the `whiteboards` table. All the data in the column will be lost.
  - You are about to drop the column `content_version` on the `whiteboards` table. All the data in the column will be lost.
  - You are about to drop the column `snapshot_s3_key` on the `whiteboards` table. All the data in the column will be lost.
  - Added the required column `created_by` to the `whiteboards` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "whiteboards" DROP COLUMN "content_s3_key",
DROP COLUMN "content_version",
DROP COLUMN "snapshot_s3_key",
ADD COLUMN     "created_by" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "element_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "file_size_bytes" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_snapshot_at" TIMESTAMP(3),
ADD COLUMN     "last_snapshot_stream_id" VARCHAR(50),
ADD COLUMN     "s3_key" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "project_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "whiteboard_collaborators" (
    "id" TEXT NOT NULL,
    "whiteboard_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whiteboard_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whiteboard_collaborators_user_id_idx" ON "whiteboard_collaborators"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "whiteboard_collaborators_whiteboard_id_user_id_key" ON "whiteboard_collaborators"("whiteboard_id", "user_id");

-- CreateIndex
CREATE INDEX "whiteboards_workspace_id_idx" ON "whiteboards"("workspace_id");

-- CreateIndex
CREATE INDEX "whiteboards_project_id_idx" ON "whiteboards"("project_id");

-- CreateIndex
CREATE INDEX "whiteboards_created_by_idx" ON "whiteboards"("created_by");

-- CreateIndex
CREATE INDEX "whiteboards_updated_at_idx" ON "whiteboards"("updated_at" DESC);

-- AddForeignKey
ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whiteboard_collaborators" ADD CONSTRAINT "whiteboard_collaborators_whiteboard_id_fkey" FOREIGN KEY ("whiteboard_id") REFERENCES "whiteboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whiteboard_collaborators" ADD CONSTRAINT "whiteboard_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
