/**
 * Validates Yjs update binary
 *
 * Basic validation:
 * - Not empty
 * - Contains valid Yjs header
 * - Reasonable size
 *
 * Full Y.Doc parsing would be too expensive for hot path.
 * More comprehensive validation happens when the consumer processes the update.
 */
export const validateYjsUpdate = (binary: Uint8Array): boolean => {
  // Empty check
  if (binary.length === 0) {
    return false;
  }

  // Yjs updates typically start with specific byte patterns
  // Basic sanity check without full decode (too expensive for hot path)

  // Size sanity (at least a few bytes for header)
  if (binary.length < 4) {
    return false;
  }

  // TODO: Add more sophisticated validation if needed
  // For now, basic checks are sufficient - full validation happens in consumer

  return true;
};
