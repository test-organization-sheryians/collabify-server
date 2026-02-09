/**
 * Y.js CRDT Library Wrapper
 *
 * **Purpose:** Centralized Y.js import to handle CommonJS/ESM interop
 * **Note:** TypeScript handles this transpilation correctly at runtime
 */

// @ts-expect-error - TypeScript transpiles this correctly to CommonJS require
// The lint warning is a false positive for TypeScript module resolution
import * as Y from "yjs";

export { Y };
