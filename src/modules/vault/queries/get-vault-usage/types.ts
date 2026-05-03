export interface VaultUsageResult {
  projectUsedBytes: bigint;
  projectReservedBytes: bigint;
  projectLimitBytes: bigint;
  projectFileCount: number;
  projectFileCountLimit: number;
  workspaceUsedBytes: bigint;
  workspaceReservedBytes: bigint;
  workspaceLimitBytes: bigint;
  workspaceFileCount: number;
  workspaceFileCountLimit: number;
  percentUsed: number;
}
