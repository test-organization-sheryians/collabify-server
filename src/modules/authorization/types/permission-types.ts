export type PermissionScope =
  | { type: "workspace"; id: string }
  | { type: "project"; id: string; workspaceId: string }
  | { type: "resource"; id: string; projectId: string; workspaceId: string };

export type PermissionResultReason =
  | "owner_bypass"
  | "cache_hit"
  | "role"
  | "policy"
  | "default_deny";

export interface PermissionResult {
  allowed: boolean;
  reason: PermissionResultReason;
}

export interface ConditionContext {
  userId: string;
  resource: Record<string, unknown>;
}

export type ConditionOperator = "StringEquals" | "BoolEquals" | "NullEquals";

export type ConditionBlock = Partial<
  Record<ConditionOperator, Record<string, unknown>>
>;
