-- Add logo_s3_key to projects and workspaces (S3 key instead of presigned URL as per AIS-66)
ALTER TABLE "projects" ADD COLUMN "logo_s3_key" TEXT;
ALTER TABLE "workspaces" ADD COLUMN "logo_s3_key" TEXT;

-- Add logo_url back (was in original v5, needed for drift detection)
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
