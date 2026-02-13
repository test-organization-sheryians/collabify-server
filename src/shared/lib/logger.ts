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
 * Check if logging is enabled for a given flag
 * Resolution: FILE > GROUP > ALL
 */
const isEnabled = (flag: string): boolean => {
  // File-level override
  const fileFlag = FILES[flag];
  if (fileFlag !== undefined) return fileFlag;

  // Group-level
  const group = getGroup(flag);
  if (group && GROUPS[group]) return true;

  // ALL flag
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
    warn: (msg: string, context?: object) => {
      baseLogger.warn(
        { ...context, caller: getCallerInfo() },
        `${prefix} ${msg}`
      );
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
