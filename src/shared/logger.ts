import pino = require("pino");
import { env } from "./config/env";

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

export const logger = pino({
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
