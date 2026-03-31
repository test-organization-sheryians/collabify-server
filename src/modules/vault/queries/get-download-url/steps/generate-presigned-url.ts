import { env } from "@/shared/config/env";

/**
 * Build the permanent vault proxy URL for a fileId.
 * No AWS call — the URL is deterministic and permanent.
 */
export function generateDownloadUrl(
  fileId: string
): { url: string } {
  const url = `${env.API_URL}/vault/file/${fileId}`;
  return { url };
}
