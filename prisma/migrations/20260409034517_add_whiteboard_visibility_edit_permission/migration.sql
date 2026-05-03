-- CreateEnum
CREATE TYPE "WhiteboardVisibility" AS ENUM ('WORKSPACE', 'MEMBERS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "WhiteboardEditPermission" AS ENUM ('COLLABORATORS', 'WORKSPACE');

-- AlterTable
ALTER TABLE "whiteboards" ADD COLUMN     "edit_permission" "WhiteboardEditPermission" NOT NULL DEFAULT 'COLLABORATORS',
ADD COLUMN     "visibility" "WhiteboardVisibility" NOT NULL DEFAULT 'WORKSPACE';
