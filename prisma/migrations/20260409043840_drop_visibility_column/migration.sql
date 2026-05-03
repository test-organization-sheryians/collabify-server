/*
  Warnings:

  - You are about to drop the column `edit_permission` on the `whiteboards` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `whiteboards` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "whiteboards" DROP COLUMN "edit_permission",
DROP COLUMN "visibility";

-- DropEnum
DROP TYPE "WhiteboardEditPermission";

-- DropEnum
DROP TYPE "WhiteboardVisibility";
