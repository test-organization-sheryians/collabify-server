-- Add unique constraint on (project_id, name) for vault_folders.
-- This ensures system folders (From Chat, From Pages, From Whiteboards, From Tasks)
-- are created only once per project, preventing duplicate folder creation on every upload.
--
-- Before adding the constraint, deduplicate any existing duplicate system folders:
-- For each (project_id, name) group, keep the oldest folder (lowest id alphabetically)
-- and re-parent all files from the duplicates to the keeper, then delete duplicates.

-- Step 1: Consolidate files from duplicate system folders into the oldest one
WITH ranked AS (
  SELECT
    id,
    project_id,
    name,
    is_system,
    ROW_NUMBER() OVER (PARTITION BY project_id, name ORDER BY created_at ASC, id ASC) AS rn
  FROM vault_folders
  WHERE deleted_at IS NULL
),
keepers AS (
  SELECT id AS keep_id, project_id, name
  FROM ranked
  WHERE rn = 1
),
duplicates AS (
  SELECT r.id AS dup_id, k.keep_id
  FROM ranked r
  JOIN keepers k ON r.project_id = k.project_id AND r.name = k.name
  WHERE r.rn > 1
)
UPDATE vault_files
SET folder_id = d.keep_id
FROM duplicates d
WHERE vault_files.folder_id = d.dup_id;

-- Step 2: Soft-delete duplicate folders (keep only the oldest per project+name)
WITH ranked AS (
  SELECT
    id,
    project_id,
    name,
    ROW_NUMBER() OVER (PARTITION BY project_id, name ORDER BY created_at ASC, id ASC) AS rn
  FROM vault_folders
  WHERE deleted_at IS NULL
)
UPDATE vault_folders
SET deleted_at = NOW()
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- Step 3: Add the unique constraint (only on non-deleted folders)
-- Using a partial index since deleted_at is nullable and we allow "reuse" of a name after deletion.
CREATE UNIQUE INDEX "vault_folders_project_id_name_key"
  ON "vault_folders" ("project_id", "name")
  WHERE "deleted_at" IS NULL;