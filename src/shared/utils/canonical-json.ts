/**
 * Deterministic JSON stringify.
 * Sorts object keys recursively to ensure {a:1, b:2} === {b:2, a:1}
 */
export const stableStringify = (obj: unknown): string => {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => stableStringify(item)).join(",") + "]";
  }

  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys
      .map((key) => {
        const val = (obj as Record<string, unknown>)[key];
        return JSON.stringify(key) + ":" + stableStringify(val);
      })
      .join(",") +
    "}"
  );
};
