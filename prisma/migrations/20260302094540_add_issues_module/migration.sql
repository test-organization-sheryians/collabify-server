-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NO_PRIORITY');

-- CreateEnum
CREATE TYPE "IssueDescriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "issue_statuses" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "icon" TEXT,
    "position" DOUBLE PRECISION NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "issue_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_labels" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "issue_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description_s3_key" TEXT,
    "status_id" TEXT NOT NULL,
    "priority" "IssuePriority" NOT NULL DEFAULT 'NO_PRIORITY',
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "assignee_id" TEXT,
    "due_date" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_to_labels" (
    "issue_id" TEXT NOT NULL,
    "label_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_to_labels_pkey" PRIMARY KEY ("issue_id","label_id")
);

-- CreateTable
CREATE TABLE "issue_description_files" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "status" "IssueDescriptionStatus" NOT NULL DEFAULT 'PENDING',
    "size_bytes" INTEGER,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_description_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issue_statuses_project_id_position_idx" ON "issue_statuses"("project_id", "position");

-- CreateIndex
CREATE INDEX "issue_statuses_project_id_is_system_idx" ON "issue_statuses"("project_id", "is_system");

-- CreateIndex
CREATE INDEX "issue_labels_project_id_idx" ON "issue_labels"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "issue_labels_project_id_name_key" ON "issue_labels"("project_id", "name");

-- CreateIndex
CREATE INDEX "issues_project_id_status_id_priority_position_idx" ON "issues"("project_id", "status_id", "priority", "position");

-- CreateIndex
CREATE INDEX "issues_project_id_assignee_id_idx" ON "issues"("project_id", "assignee_id");

-- CreateIndex
CREATE INDEX "issues_project_id_due_date_idx" ON "issues"("project_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "issues_project_id_number_key" ON "issues"("project_id", "number");

-- CreateIndex
CREATE INDEX "issue_to_labels_label_id_idx" ON "issue_to_labels"("label_id");

-- CreateIndex
CREATE INDEX "issue_description_files_issue_id_status_idx" ON "issue_description_files"("issue_id", "status");

-- CreateIndex
CREATE INDEX "issue_description_files_status_created_at_idx" ON "issue_description_files"("status", "created_at");

-- AddForeignKey
ALTER TABLE "issue_statuses" ADD CONSTRAINT "issue_statuses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "issue_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_to_labels" ADD CONSTRAINT "issue_to_labels_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_to_labels" ADD CONSTRAINT "issue_to_labels_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "issue_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_description_files" ADD CONSTRAINT "issue_description_files_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
