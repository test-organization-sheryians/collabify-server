import type { PolicyStatement } from "./policy-types";

/**
 * Evaluates a list of PolicyStatements for a given action using DENY-wins rule.
 *
 *   1. If ANY DENY statement matches → return false
 *   2. If ANY ALLOW statement matches → return true
 *   3. Default → false
 */
export function evaluatePolicies(
  statements: PolicyStatement[],
  action: string
): boolean {
  const relevant = statements.filter((s) => s.action === action);

  // DENY wins: any single DENY immediately blocks
  if (relevant.some((s) => s.effect === "DENY")) return false;

  // ALLOW: at least one ALLOW required
  return relevant.some((s) => s.effect === "ALLOW");
}
