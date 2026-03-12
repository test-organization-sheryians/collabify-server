export type PolicyEffect = "ALLOW" | "DENY";

export interface PolicyStatement {
  effect: PolicyEffect;
  action: string;
  conditions?: Record<string, unknown>;
  principalId?: string | null; // null = applies to ALL
}

export interface ResourceContext {
  id: string;
  createdBy?: string;
  isLocked?: boolean;
  isArchived?: boolean;
  isPrivate?: boolean;
  [key: string]: unknown;
}
