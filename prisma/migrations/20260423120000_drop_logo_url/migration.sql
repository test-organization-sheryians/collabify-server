-- Drop deprecated logo_url columns (already dropped via db push)
ALTER TABLE "projects" DROP COLUMN IF EXISTS "logo_url";
ALTER TABLE "workspaces" DROP COLUMN IF EXISTS "logo_url";