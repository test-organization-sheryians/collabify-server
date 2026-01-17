/*
  Warnings:

  - You are about to drop the column `clerk_id` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_clerk_id_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "clerk_id";

-- CreateIndex
CREATE UNIQUE INDEX "users_id_key" ON "users"("id");
