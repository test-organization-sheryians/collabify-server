/**
 * Vault — Hard Limits & Constants
 *
 * All quota values are sourced here. Handlers must not use magic numbers.
 * Future: replace with VaultQuotaGuard.getLimit() once plan-tier billing lands.
 */

// ── Storage Limits ─────────────────────────────────────────────────────────────

export const VAULT_LIMITS = {
  /** Max bytes per individual file upload (50 MB) */
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024,

  /** Max total ACTIVE storage per project (5 GB) */
  MAX_PROJECT_STORAGE_BYTES:
    BigInt(5) * BigInt(1024) * BigInt(1024) * BigInt(1024),

  /** Max total ACTIVE storage per workspace (20 GB) */
  MAX_WORKSPACE_STORAGE_BYTES:
    BigInt(20) * BigInt(1024) * BigInt(1024) * BigInt(1024),

  /** Max ACTIVE file count per project */
  MAX_PROJECT_FILE_COUNT: 10_000,

  /** Max ACTIVE file count per workspace */
  MAX_WORKSPACE_FILE_COUNT: 100_000,
} as const;

// ── S3 TTLs ────────────────────────────────────────────────────────────────────

export const VAULT_S3 = {
  /** Presigned PUT URL TTL (seconds) — 15 minutes */
  PRESIGNED_PUT_TTL_SECONDS: 900,

  /** Presigned GET URL TTL (seconds) — 5 minutes */
  PRESIGNED_GET_TTL_SECONDS: 300,
} as const;

// ── MIME Allowlist ─────────────────────────────────────────────────────────────

export const VAULT_ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
  "image/heic",
  // Video
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  // Documents
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  // Archives
  "application/zip",
  "application/x-tar",
  "application/gzip",
  "application/x-7z-compressed",
  // Text & Code
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/html",
  "text/css",
  "text/javascript",
  "application/json",
  "application/xml",
  // Design
  "image/vnd.adobe.photoshop",
  "application/postscript",
]);

/** Extensions that are always blocked regardless of MIME type match */
export const VAULT_BLOCKED_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".js",
  ".ts",
  ".php",
  ".py",
  ".rb",
]);

// ── System Folder Names ─────────────────────────────────────────────────────────

export const SYSTEM_FOLDER_NAMES = {
  PAGE: "From Pages",
  CHAT: "From Chat",
  WHITEBOARD: "From Whiteboards",
  TASK: "From Tasks",
} as const;
