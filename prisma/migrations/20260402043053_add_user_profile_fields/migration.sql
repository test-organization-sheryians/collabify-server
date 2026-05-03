/*
  Warnings:

  - A unique constraint covering the columns `[stripe_customer_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "language" TEXT DEFAULT 'en',
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "timezone" TEXT DEFAULT 'UTC';

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");
