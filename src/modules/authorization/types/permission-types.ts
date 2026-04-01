export type WorkspaceScope = { type: "workspace"; id: string };
export type ProjectScope = { type: "project"; id: string; workspaceId: string };
export type ResourceScope = { type: "resource"; id: string; projectId: string; workspaceId: string };

export type PermissionScope = WorkspaceScope | ProjectScope | ResourceScope;

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

export type ConditionOperator =
  | "StringEquals"
  | "StringContains"
  | "BoolEquals"
  | "NullEquals"
  | "NumericGreaterThan"
  | "NumericLessThan"
  | "ArrayContains";

export type ConditionBlock = Partial<
  Record<ConditionOperator, Record<string, unknown>>
>;
