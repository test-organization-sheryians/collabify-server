import pino from "pino";
import { env } from "../config/env";
import { ALL, FILES, GROUPS } from "./debug-flags";
import type { GroupFlag, FileFlag } from "./debug-flags";

/**
 * Redaction rules for sensitive data
 */
const redact = ["req.headers.authorization"];

if (!env.LOG_HEADERS) {
  redact.push("req.headers", "res.headers");
}

if (!env.LOG_COOKIES) {
  redact.push("req.headers.cookie", "res.headers['set-cookie']");
}

if (!env.LOG_REQ_BODY) {
  redact.push("req.body");
}

if (!env.LOG_RES_BODY) {
  redact.push("res.body");
}

if (!env.LOG_GRAPHQL_VARS) {
  redact.push("res.body");
}

/**
 * Base Pino instance
 */
const baseLogger = pino({
  level: env.LOG_LEVEL,
  redact,
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "HH:MM:ss Z",
          },
        }
      : undefined,
});

/**
 * Extract group from file flag
 */
const getGroup = (flag: string): GroupFlag | null => {
  const [group] = flag.split(":");
  return group in GROUPS ? (group as GroupFlag) : null;
};

/**
 * Flow-based group mappings
 * Maps file flags to their related flow groups
 */
const FLOW_GROUPS: Record<string, GroupFlag[]> = {
  // Whiteboard Stream Worker V2 Flow
  "whiteboard:infra:stream-worker": ["whiteboard-stream-worker"],
  "whiteboard:stream-worker:processor": [
    "whiteboard-stream-worker",
    "whiteboard-board-update-flow",
    "whiteboard-cold-start",
  ],
  "whiteboard:stream-worker:loops": ["whiteboard-stream-worker"],
  "whiteboard:stream-worker:s3-sync": [
    "whiteboard-stream-worker",
    "whiteboard-snapshot-flow",
  ],
  "whiteboard:stream-worker:lua": ["whiteboard-stream-worker"],
  "whiteboard:threshold:registry": ["whiteboard-stream-worker"],
  "whiteboard:threshold:stream-length": ["whiteboard-stream-worker"],

  // Whiteboard WebSocket Flow
  "whiteboard:ws:subscribe": ["whiteboard-ws"],
  "whiteboard:ws:unsubscribe": ["whiteboard-ws"],
  "whiteboard:ws:board-update": [
    "whiteboard-ws",
    "whiteboard-board-update-flow",
  ],
  "whiteboard:ws:cursor": ["whiteboard-ws"],
  "whiteboard:ws:selection": ["whiteboard-ws"],

  // Whiteboard Snapshot Flow
  "whiteboard:infra:s3": ["whiteboard-snapshot-flow", "whiteboard-cold-start"],

  // Chat Message Flow
  "chat:ws:send-message": ["chat-message-flow"],
  "chat:jobs:persist-message": ["chat-message-flow"],
  "chat:jobs:persist-message-edit": ["chat-message-flow"],
  "chat:jobs:persist-message-delete": ["chat-message-flow"],
  "chat:jobs:cleanup-outbox": ["chat-message-flow"],
  "chat:jobs:recover-stuck-outbox": ["chat-message-flow"],

  // Chat Reactions Flow
  "chat:ws:add-reaction": ["chat-reactions"],
  "chat:ws:remove-reaction": ["chat-reactions"],
  "chat:jobs:persist-reactions": ["chat-reactions"],
  "chat:jobs:reconcile-reactions": ["chat-reactions"],
  "chat:domain:reactions:batch": ["chat-reactions"],
  "chat:domain:reactions:helpers": ["chat-reactions"],
  "chat:domain:reactions:metrics": ["chat-reactions"],

  // Vault Upload E2E Flow
  "vault:services:request-upload": ["vault-upload-flow"],
  "vault:services:request-upload:validate": ["vault-upload-flow"],
  "vault:services:request-upload:quota": ["vault-upload-flow"],
  "vault:services:request-upload:create": ["vault-upload-flow"],
  "vault:services:request-upload:presign": ["vault-upload-flow"],
  "vault:services:confirm-upload": ["vault-upload-flow"],
  "vault:services:confirm-upload:validate": ["vault-upload-flow"],
  "vault:services:confirm-upload:verify-s3": ["vault-upload-flow"],
  "vault:services:confirm-upload:activate": ["vault-upload-flow"],
  "vault:lib:quota-guard": ["vault-upload-flow"],
};

/**
 * Check if logging is enabled for a given flag
 * Resolution: FILE > FLOW_GROUP > MODULE_GROUP > ALL
 */
const isEnabled = (flag: string): boolean => {
  // 1. File-level override (highest priority)
  const fileFlag = FILES[flag];
  if (fileFlag !== undefined) return fileFlag;

  // 2. Flow-based group (e.g., "whiteboard-stream-worker")
  const flowGroups = FLOW_GROUPS[flag];
  if (flowGroups?.some((flowGroup) => GROUPS[flowGroup])) return true;

  // 3. Module-level group (e.g., "chat", "whiteboard")
  const group = getGroup(flag);
  if (group && GROUPS[group]) return true;

  // 4. ALL flag (lowest priority)
  return ALL;
};

/**
 * Extracts the file path and line number of the caller
 */
function getCallerInfo() {
  const stack = new Error().stack;
  if (!stack) return "";

  // Split stack into lines and look for the first line that isn't inside this file
  const lines = stack.split("\n");
  const callerLine = lines.find(
    (line) =>
      line.includes("/") &&
      !line.includes("logger.ts") &&
      !line.includes("node_modules")
  );

  if (!callerLine) return "";

  // Extract path and line number (e.g., /path/to/file.ts:12:34)
  const match = callerLine.match(/\((.*?)\)|at (.*?)$/);
  const fullPath = match ? match[1] || match[2] : "";

  // Clean up path - show relative to project root if possible or just basename
  const parts = fullPath.split("/");
  const fileName = parts[parts.length - 1] || "";

  return fileName;
}

/**
 * Logger interface
 */
export interface Logger {
  debug: (msg: string, context?: object) => void;
  info: (msg: string, context?: object) => void;
  warn: (msg: string, context?: object) => void;
  error: (msg: string, context?: object | Error) => void;
}

/**
 * Create a logger for a specific feature/file
 * @param flag The debug flag to use
 */
export function createLogger(flag: string): Logger {
  const prefix = `[${flag}]`;

  return {
    get debug() {
      if (!isEnabled(flag)) return () => {};
      return (msg: string, context?: object) => {
        baseLogger.debug(
          { ...context, caller: getCallerInfo() },
          `${prefix} ${msg}`
        );
      };
    },
    get info() {
      if (!isEnabled(flag)) return () => {};
      return (msg: string, context?: object) => {
        baseLogger.info(
          { ...context, caller: getCallerInfo() },
          `${prefix} ${msg}`
        );
      };
    },
    get warn() {
      if (!isEnabled(flag)) return () => {};
      return (msg: string, context?: object) => {
        baseLogger.warn(
          { ...context, caller: getCallerInfo() },
          `${prefix} ${msg}`
        );
      };
    },
    error: (msg: string, context?: object | Error) => {
      if (context instanceof Error) {
        baseLogger.error(
          { err: context, caller: getCallerInfo() },
          `${prefix} ${msg}`
        );
      } else {
        baseLogger.error(
          { ...context, caller: getCallerInfo() },
          `${prefix} ${msg}`
        );
      }
    },
  };
}

// Export the base logger for backward compatibility or direct use if needed
export { baseLogger as logger };
