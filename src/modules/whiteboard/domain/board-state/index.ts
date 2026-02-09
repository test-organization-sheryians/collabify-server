// Y.Doc merge operations
export {
  mergeYDocUpdates,
  mergeUpdates,
  applyUpdateToDoc,
  createEmptyDoc,
  encodeStateAsUpdate,
  getDocSize,
} from "./merge-updates";

// State vector diff computation
export {
  computeStateVectorDiff,
  encodeStateVector,
  isClientUpToDate,
} from "./state-vector-diff";

// Encoding/decoding utilities
export {
  validateYDocUpdate,
  encodeYDocToBase64,
  decodeBase64ToYDoc,
  countYDocElements,
} from "./encode-decode";
