-- CreateEnum
CREATE TYPE "PluginType" AS ENUM ('CHAT', 'WHITEBOARD', 'PAGES', 'VAULT', 'ISSUES');

-- CreateTable
CREATE TABLE "project_plugins" (
    "project_id" TEXT NOT NULL,
    "type" "PluginType" NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB
);

-- CreateTable
CREATE TABLE "workspace_plugins" (
    "workspace_id" TEXT NOT NULL,
    "type" "PluginType" NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB
);

-- CreateIndex
CREATE UNIQUE INDEX "project_plugins_project_id_type_key" ON "project_plugins"("project_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_plugins_workspace_id_type_key" ON "workspace_plugins"("workspace_id", "type");

-- AddForeignKey
ALTER TABLE "project_plugins" ADD CONSTRAINT "project_plugins_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_plugins" ADD CONSTRAINT "workspace_plugins_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
