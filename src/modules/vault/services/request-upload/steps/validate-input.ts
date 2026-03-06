import { AppError } from "@/shared/errors";
import {
  VAULT_ALLOWED_MIME_TYPES,
  VAULT_BLOCKED_EXTENSIONS,
  VAULT_LIMITS,
} from "../../../lib/constants";
import type { RequestVaultUploadInput } from "../schema";
import { createLogger } from "@/shared/lib/logger";
import path from "path";

const logger = createLogger("vault:services:request-upload:validate");

export function validateUploadInput(input: RequestVaultUploadInput): void {
  logger.info("validate-input: start", {
    name: input.name,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });

  if (input.sizeBytes > VAULT_LIMITS.MAX_FILE_SIZE_BYTES) {
    throw AppError.badRequest(
      `File exceeds the ${VAULT_LIMITS.MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit`
    );
  }

  if (!VAULT_ALLOWED_MIME_TYPES.has(input.mimeType)) {
    throw AppError.badRequest(`MIME type '${input.mimeType}' is not allowed`);
  }

  const ext = path.extname(input.name).toLowerCase();
  if (VAULT_BLOCKED_EXTENSIONS.has(ext)) {
    throw AppError.badRequest(`File extension '${ext}' is not allowed`);
  }

  logger.info("validate-input: passed", { name: input.name });
}
