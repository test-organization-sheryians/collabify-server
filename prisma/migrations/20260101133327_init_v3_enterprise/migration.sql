/*
  Warnings:

  - You are about to drop the column `ip_address` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `resource_target` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `user_agent` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `is_private` on the `chat_channels` table. All the data in the column will be lost.
  - You are about to drop the column `attachment_ids` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `parent_message_id` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `emoji_code` on the `message_reactions` table. All the data in the column will be lost.
  - You are about to drop the column `is_archived` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `project_id` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `resource_id` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `resource_type` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `role_id` on the `project_members` table. All the data in the column will be lost.
  - You are about to drop the column `archived_at` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `icon` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `is_global_ban` on the `users` table. All the data in the column will be lost.
  - The `role` column on the `workspace_invites` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `status` on the `workspace_members` table. All the data in the column will be lost.
  - The `role` column on the `workspace_members` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `sso_enabled` on the `workspaces` table. All the data in the column will be lost.
  - You are about to drop the `ai_conversations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `canvas_boards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `canvas_data_blobs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat_channel_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `doc_content_blobs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `doc_pages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `doc_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `doc_search_indices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `file_assets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `file_folders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `meeting_participants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `meeting_recordings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `meetings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_configs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscription_usages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscriptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `task_comments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `task_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `task_statuses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_project_view_preferences` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[message_id,workspace_member_id,emoji]` on the table `message_reactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `target_resource` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspace_id` to the `chat_channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emoji` to the `message_reactions` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `notifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "PolicyEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "BoardType" AS ENUM ('KANBAN', 'LIST', 'TIMELINE');

-- CreateEnum
CREATE TYPE "BoardViewStyle" AS ENUM ('NORMAL', 'STANDARD');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('PUBLIC', 'PRIVATE', 'DM');

-- CreateEnum
CREATE TYPE "MeetStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED');

-- DropForeignKey
ALTER TABLE "ai_conversations" DROP CONSTRAINT "ai_conversations_project_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_conversations" DROP CONSTRAINT "ai_conversations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_messages" DROP CONSTRAINT "ai_messages_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_user_id_fkey";

-- DropForeignKey
ALTER TABLE "canvas_boards" DROP CONSTRAINT "canvas_boards_project_id_fkey";

-- DropForeignKey
ALTER TABLE "canvas_data_blobs" DROP CONSTRAINT "canvas_data_blobs_board_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_channel_members" DROP CONSTRAINT "chat_channel_members_channel_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_channel_members" DROP CONSTRAINT "chat_channel_members_workspace_member_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_parent_message_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_sender_member_id_fkey";

-- DropForeignKey
ALTER TABLE "doc_content_blobs" DROP CONSTRAINT "doc_content_blobs_page_id_fkey";

-- DropForeignKey
ALTER TABLE "doc_pages" DROP CONSTRAINT "doc_pages_created_by_fkey";

-- DropForeignKey
ALTER TABLE "doc_pages" DROP CONSTRAINT "doc_pages_parent_page_id_fkey";

-- DropForeignKey
ALTER TABLE "doc_pages" DROP CONSTRAINT "doc_pages_project_id_fkey";

-- DropForeignKey
ALTER TABLE "doc_permissions" DROP CONSTRAINT "doc_permissions_doc_page_id_fkey";

-- DropForeignKey
ALTER TABLE "doc_permissions" DROP CONSTRAINT "doc_permissions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "doc_search_indices" DROP CONSTRAINT "doc_search_indices_page_id_fkey";

-- DropForeignKey
ALTER TABLE "file_assets" DROP CONSTRAINT "file_assets_folder_id_fkey";

-- DropForeignKey
ALTER TABLE "file_assets" DROP CONSTRAINT "file_assets_project_id_fkey";

-- DropForeignKey
ALTER TABLE "file_assets" DROP CONSTRAINT "file_assets_uploader_member_id_fkey";

-- DropForeignKey
ALTER TABLE "file_folders" DROP CONSTRAINT "file_folders_parent_folder_id_fkey";

-- DropForeignKey
ALTER TABLE "file_folders" DROP CONSTRAINT "file_folders_project_id_fkey";

-- DropForeignKey
ALTER TABLE "meeting_participants" DROP CONSTRAINT "meeting_participants_meeting_id_fkey";

-- DropForeignKey
ALTER TABLE "meeting_participants" DROP CONSTRAINT "meeting_participants_workspace_member_id_fkey";

-- DropForeignKey
ALTER TABLE "meeting_recordings" DROP CONSTRAINT "meeting_recordings_meeting_id_fkey";

-- DropForeignKey
ALTER TABLE "meetings" DROP CONSTRAINT "meetings_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_configs" DROP CONSTRAINT "project_configs_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_members" DROP CONSTRAINT "project_members_role_id_fkey";

-- DropForeignKey
ALTER TABLE "project_permissions" DROP CONSTRAINT "project_permissions_role_id_fkey";

-- DropForeignKey
ALTER TABLE "project_roles" DROP CONSTRAINT "project_roles_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "subscription_usages" DROP CONSTRAINT "subscription_usages_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "task_comments" DROP CONSTRAINT "task_comments_author_member_id_fkey";

-- DropForeignKey
ALTER TABLE "task_comments" DROP CONSTRAINT "task_comments_task_id_fkey";

-- DropForeignKey
ALTER TABLE "task_items" DROP CONSTRAINT "task_items_assignee_member_id_fkey";

-- DropForeignKey
ALTER TABLE "task_items" DROP CONSTRAINT "task_items_parent_task_id_fkey";

-- DropForeignKey
ALTER TABLE "task_items" DROP CONSTRAINT "task_items_project_id_fkey";

-- DropForeignKey
ALTER TABLE "task_items" DROP CONSTRAINT "task_items_reporter_member_id_fkey";

-- DropForeignKey
ALTER TABLE "task_items" DROP CONSTRAINT "task_items_status_id_fkey";

-- DropForeignKey
ALTER TABLE "task_statuses" DROP CONSTRAINT "task_statuses_project_id_fkey";

-- DropForeignKey
ALTER TABLE "user_project_view_preferences" DROP CONSTRAINT "user_project_view_preferences_project_id_fkey";

-- DropForeignKey
ALTER TABLE "user_project_view_preferences" DROP CONSTRAINT "user_project_view_preferences_user_id_fkey";

-- DropIndex
DROP INDEX "message_reactions_message_id_workspace_member_id_emoji_code_key";

-- DropIndex
DROP INDEX "notifications_created_at_idx";

-- DropIndex
DROP INDEX "workspace_invites_workspace_id_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "ip_address",
DROP COLUMN "resource_target",
DROP COLUMN "user_agent",
ADD COLUMN     "target_resource" TEXT NOT NULL,
ALTER COLUMN "actor_user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "chat_channels" DROP COLUMN "is_private",
ADD COLUMN     "type" "ChannelType" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "workspace_id" TEXT NOT NULL,
ALTER COLUMN "project_id" DROP NOT NULL,
ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "attachment_ids",
DROP COLUMN "parent_message_id",
ADD COLUMN     "attachmentIds" JSONB;

-- AlterTable
ALTER TABLE "message_reactions" DROP COLUMN "emoji_code",
ADD COLUMN     "emoji" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "is_archived",
DROP COLUMN "project_id",
DROP COLUMN "resource_id",
DROP COLUMN "resource_type",
ADD COLUMN     "chat_message_id" TEXT,
ADD COLUMN     "page_id" TEXT,
ADD COLUMN     "task_id" TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "project_members" DROP COLUMN "role_id";

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "archived_at",
DROP COLUMN "icon",
ALTER COLUMN "is_private" SET DEFAULT true;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "is_global_ban";

-- AlterTable
ALTER TABLE "workspace_invites" ADD COLUMN     "deleted_at" TIMESTAMP(3),
DROP COLUMN "role",
ADD COLUMN     "role" "RoleType" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "workspace_members" DROP COLUMN "status",
DROP COLUMN "role",
ADD COLUMN     "role" "RoleType" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "workspaces" DROP COLUMN "sso_enabled";

-- DropTable
DROP TABLE "ai_conversations";

-- DropTable
DROP TABLE "ai_messages";

-- DropTable
DROP TABLE "canvas_boards";

-- DropTable
DROP TABLE "canvas_data_blobs";

-- DropTable
DROP TABLE "chat_channel_members";

-- DropTable
DROP TABLE "doc_content_blobs";

-- DropTable
DROP TABLE "doc_pages";

-- DropTable
DROP TABLE "doc_permissions";

-- DropTable
DROP TABLE "doc_search_indices";

-- DropTable
DROP TABLE "file_assets";

-- DropTable
DROP TABLE "file_folders";

-- DropTable
DROP TABLE "meeting_participants";

-- DropTable
DROP TABLE "meeting_recordings";

-- DropTable
DROP TABLE "meetings";

-- DropTable
DROP TABLE "project_configs";

-- DropTable
DROP TABLE "project_permissions";

-- DropTable
DROP TABLE "project_roles";

-- DropTable
DROP TABLE "subscription_usages";

-- DropTable
DROP TABLE "subscriptions";

-- DropTable
DROP TABLE "task_comments";

-- DropTable
DROP TABLE "task_items";

-- DropTable
DROP TABLE "task_statuses";

-- DropTable
DROP TABLE "user_project_view_preferences";

-- DropEnum
DROP TYPE "AccessPolicy";

-- DropEnum
DROP TYPE "ActionType";

-- DropEnum
DROP TYPE "AiRole";

-- DropEnum
DROP TYPE "MeetingStatus";

-- DropEnum
DROP TYPE "MemberStatus";

-- DropEnum
DROP TYPE "ModuleType";

-- DropEnum
DROP TYPE "NotificationLevel";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "PlanType";

-- DropEnum
DROP TYPE "ResourceType";

-- DropEnum
DROP TYPE "SubStatus";

-- DropEnum
DROP TYPE "TaskIssueType";

-- DropEnum
DROP TYPE "TaskStatusCategory";

-- DropEnum
DROP TYPE "UsageMetric";

-- DropEnum
DROP TYPE "ViewPreference";

-- DropEnum
DROP TYPE "WorkspaceRole";

-- CreateTable
CREATE TABLE "system_permissions" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "module" TEXT NOT NULL,

    CONSTRAINT "system_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_roles" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "member_roles" (
    "workspace_member_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "member_roles_pkey" PRIMARY KEY ("workspace_member_id","role_id")
);

-- CreateTable
CREATE TABLE "resource_policies" (
    "id" TEXT NOT NULL,
    "workspace_member_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "effect" "PolicyEffect" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_counters" (
    "project_id" TEXT NOT NULL,
    "counter_type" TEXT NOT NULL,
    "current_val" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "parent_page_id" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "emoji_icon" TEXT,
    "cover_image_url" TEXT,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "content_s3_key" TEXT,
    "content_version" INTEGER NOT NULL DEFAULT 1,
    "author_member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vault_folders" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "parent_folder_id" TEXT,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vault_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vault_files" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "uploader_member_id" TEXT,
    "name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "s3_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vault_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whiteboards" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "snapshot_s3_key" TEXT,
    "content_s3_key" TEXT,
    "content_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "whiteboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boards" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BoardType" NOT NULL DEFAULT 'KANBAN',
    "view_style" "BoardViewStyle" NOT NULL DEFAULT 'NORMAL',
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "seq_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" JSONB,
    "status_name" TEXT NOT NULL DEFAULT 'Todo',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "assignee_member_id" TEXT,
    "reporter_member_id" TEXT NOT NULL,
    "parent_task_id" TEXT,
    "start_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_members" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "workspace_member_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_msg_id" TEXT,

    CONSTRAINT "chat_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meets" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "status" "MeetStatus" NOT NULL DEFAULT 'SCHEDULED',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "meets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meet_participants" (
    "id" TEXT NOT NULL,
    "meet_id" TEXT NOT NULL,
    "workspace_member_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "meet_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collabify_ai_conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collabify_ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collabify_ai_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citationData" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collabify_ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_roles_workspace_id_name_key" ON "custom_roles"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "resource_policies_resource_id_resource_type_idx" ON "resource_policies"("resource_id", "resource_type");

-- CreateIndex
CREATE UNIQUE INDEX "resource_policies_workspace_member_id_resource_id_permissio_key" ON "resource_policies"("workspace_member_id", "resource_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_counters_project_id_counter_type_key" ON "project_counters"("project_id", "counter_type");

-- CreateIndex
CREATE INDEX "pages_project_id_idx" ON "pages"("project_id");

-- CreateIndex
CREATE INDEX "pages_workspace_id_idx" ON "pages"("workspace_id");

-- CreateIndex
CREATE INDEX "vault_files_project_id_folder_id_idx" ON "vault_files"("project_id", "folder_id");

-- CreateIndex
CREATE INDEX "tasks_workspace_id_idx" ON "tasks"("workspace_id");

-- CreateIndex
CREATE INDEX "tasks_board_id_idx" ON "tasks"("board_id");

-- CreateIndex
CREATE INDEX "tasks_assignee_member_id_idx" ON "tasks"("assignee_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_project_id_seq_id_key" ON "tasks"("project_id", "seq_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_members_channel_id_workspace_member_id_key" ON "chat_members"("channel_id", "workspace_member_id");

-- CreateIndex
CREATE INDEX "meets_project_id_idx" ON "meets"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_message_id_workspace_member_id_emoji_key" ON "message_reactions"("message_id", "workspace_member_id", "emoji");

-- AddForeignKey
ALTER TABLE "custom_roles" ADD CONSTRAINT "custom_roles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "custom_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "system_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_workspace_member_id_fkey" FOREIGN KEY ("workspace_member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "custom_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_policies" ADD CONSTRAINT "resource_policies_workspace_member_id_fkey" FOREIGN KEY ("workspace_member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_counters" ADD CONSTRAINT "project_counters_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_author_member_id_fkey" FOREIGN KEY ("author_member_id") REFERENCES "workspace_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_parent_page_id_fkey" FOREIGN KEY ("parent_page_id") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_folders" ADD CONSTRAINT "vault_folders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_folders" ADD CONSTRAINT "vault_folders_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "vault_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_files" ADD CONSTRAINT "vault_files_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_files" ADD CONSTRAINT "vault_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_files" ADD CONSTRAINT "vault_files_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "vault_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_files" ADD CONSTRAINT "vault_files_uploader_member_id_fkey" FOREIGN KEY ("uploader_member_id") REFERENCES "workspace_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_member_id_fkey" FOREIGN KEY ("assignee_member_id") REFERENCES "workspace_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_reporter_member_id_fkey" FOREIGN KEY ("reporter_member_id") REFERENCES "workspace_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_channels" ADD CONSTRAINT "chat_channels_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_workspace_member_id_fkey" FOREIGN KEY ("workspace_member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_member_id_fkey" FOREIGN KEY ("sender_member_id") REFERENCES "workspace_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meets" ADD CONSTRAINT "meets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meet_participants" ADD CONSTRAINT "meet_participants_meet_id_fkey" FOREIGN KEY ("meet_id") REFERENCES "meets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meet_participants" ADD CONSTRAINT "meet_participants_workspace_member_id_fkey" FOREIGN KEY ("workspace_member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collabify_ai_conversations" ADD CONSTRAINT "collabify_ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collabify_ai_conversations" ADD CONSTRAINT "collabify_ai_conversations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collabify_ai_messages" ADD CONSTRAINT "collabify_ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "collabify_ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_chat_message_id_fkey" FOREIGN KEY ("chat_message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
