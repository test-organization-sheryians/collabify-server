import type {
  ConditionBlock,
  ConditionContext,
} from "../types/permission-types";

/**
 * ConditionEvaluator — evaluates a condition block from a PolicyStatement or
 * RolePermission against a runtime resource context.
 *
 * Supported operators:
 *   StringEquals — exact string match (supports ${userId} interpolation)
 *   BoolEquals   — exact boolean match
 *   NullEquals   — null/not-null check
 *
 * Called by resolver.ts ONLY when permission.hasConditions === true.
 * Returns true if ALL conditions pass (logical AND).
 */
export function evaluateConditions(
  conditions: ConditionBlock,
  ctx: ConditionContext
): boolean {
  for (const [operator, checks] of Object.entries(conditions)) {
    for (const [fieldPath, expectedValue] of Object.entries(
      checks as Record<string, unknown>
    )) {
      const actualValue = resolveFieldPath(fieldPath, ctx.resource);
      const expected = interpolate(expectedValue, ctx);

      switch (operator) {
        case "StringEquals":
          if (actualValue !== expected) return false;
          break;
        case "BoolEquals":
          if (actualValue !== expected) return false;
          break;
        case "NullEquals":
          if (expected === null && actualValue !== null) return false;
          if (expected !== null && actualValue === null) return false;
          break;
        default:
          // Unknown operator — treat as condition fail (safe default)
          return false;
      }
    }
  }
  return true;
}

/** Traverse dot-notation field paths on the resource object */
function resolveFieldPath(
  path: string,
  resource: Record<string, unknown>
): unknown {
  return path.split(".").reduce<unknown>((obj, key) => {
    if (obj && typeof obj === "object") {
      return (obj as Record<string, unknown>)[key];
    }
    return undefined;
  }, resource);
}

/** Interpolate ${userId} template variables in expected values */
function interpolate(value: unknown, ctx: ConditionContext): unknown {
  if (typeof value === "string") {
    return value.replace("${userId}", ctx.userId);
  }
  return value;
}
