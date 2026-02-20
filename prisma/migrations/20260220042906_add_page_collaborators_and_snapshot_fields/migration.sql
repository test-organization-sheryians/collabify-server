/*
  Warnings:

  - You are about to drop the column `author_user_id` on the `pages` table. All the data in the column will be lost.
  - You are about to drop the column `content_s3_key` on the `pages` table. All the data in the column will be lost.
  - You are about to drop the column `content_version` on the `pages` table. All the data in the column will be lost.
  - Added the required column `created_by` to the `pages` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PageCollaboratorRole" AS ENUM ('EDITOR', 'VIEWER');

-- DropForeignKey
ALTER TABLE "pages" DROP CONSTRAINT "pages_author_user_id_fkey";

-- AlterTable
ALTER TABLE "pages" DROP COLUMN "author_user_id",
DROP COLUMN "content_s3_key",
DROP COLUMN "content_version",
ADD COLUMN     "created_by" TEXT NOT NULL,
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_snapshot_at" TIMESTAMP(3),
ADD COLUMN     "last_snapshot_stream_id" VARCHAR(50),
ADD COLUMN     "locked_by" TEXT,
ADD COLUMN     "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "s3_key" TEXT;

-- CreateTable
CREATE TABLE "page_collaborators" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "PageCollaboratorRole" NOT NULL DEFAULT 'VIEWER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_collaborators_user_id_idx" ON "page_collaborators"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_collaborators_page_id_user_id_key" ON "page_collaborators"("page_id", "user_id");

-- CreateIndex
CREATE INDEX "pages_project_id_position_idx" ON "pages"("project_id", "position");

-- CreateIndex
CREATE INDEX "pages_project_id_parent_page_id_idx" ON "pages"("project_id", "parent_page_id");

-- CreateIndex
CREATE INDEX "pages_created_by_idx" ON "pages"("created_by");

-- CreateIndex
CREATE INDEX "pages_updated_at_idx" ON "pages"("updated_at" DESC);

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_collaborators" ADD CONSTRAINT "page_collaborators_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_collaborators" ADD CONSTRAINT "page_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
