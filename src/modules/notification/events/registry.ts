import type { RegistryEntry } from "./types";

// =============================================================================
// Notification Event Registry
//
// Maps event type strings → { definition, handler } pairs.
// Registration happens at startup by each event handler module (auto-import).
// The registry is read-only after startup — no runtime modifications.
//
// Design decisions:
// - Throws on duplicate registration → fail-fast, no silent overwrites.
// - Returns undefined on unknown type → Decider routes to DLQ explicitly.
// - No circular deps: registry only imports from events/types.ts.
// =============================================================================

const registry = new Map<string, RegistryEntry>();

/**
 * Register an event type with its definition and handler.
 * Call this at module load time from each event handler's index.ts.
 *
 * @throws if the same type is registered twice (startup crash → safe fail-fast).
 */
export function register(entry: RegistryEntry): void {
  if (registry.has(entry.definition.type)) {
    throw new Error(
      `[NotificationRegistry] Duplicate registration: "${entry.definition.type}". ` +
        "Each event type must be registered exactly once."
    );
  }
  registry.set(entry.definition.type, entry);
}

/**
 * Look up a registered event by type string.
 * Returns undefined if the type is not registered (Decider handles → DLQ).
 */
export function get(type: string): RegistryEntry | undefined {
  return registry.get(type);
}

/** Returns all registered event types. Used for introspection and tests. */
export function listTypes(): string[] {
  return Array.from(registry.keys());
}

/** Returns the total number of registered event types. */
export function size(): number {
  return registry.size;
}
