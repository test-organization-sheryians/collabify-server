import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { env } from "../shared/config/env";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const connectionString = env.DATABASE_URL;

import { createLogger } from "../shared/lib/logger";

const logger = createLogger("infra:db");
const pool = new Pool({
  connectionString,
  // RDS requires SSL. Alpine Linux doesn't ship the Amazon CA bundle so we
  // skip CA chain verification (connection is still encrypted).
  // Do NOT put sslmode=require in DATABASE_URL — pg treats it as verify-full
  // and overrides this setting.
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

const adapter = new PrismaPg(pool);

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
      { emit: "event", level: "info" },
      { emit: "event", level: "warn" },
    ],
  });

// @ts-expect-error - Prisma internal typing for log emitter with adapter
db.$on("query", (e: Prisma.QueryEvent) => {
  if (e.duration < 100) return; // Ignore fast queries

  logger.debug("DB Query", {
    query: e.query,
    duration: `${e.duration}ms`,
    params: env.LOG_DB_PARAMS ? e.params : undefined,
  });
});

// @ts-expect-error - Prisma internal typing for log emitter with adapter
db.$on("error", (e: Prisma.LogEvent) => {
  logger.error("Prisma Error", { target: e.target, message: e.message });
});

// @ts-expect-error - Prisma internal typing for log emitter with adapter
db.$on("info", (e: Prisma.LogEvent) => {
  logger.info("Prisma Info", {
    target: e.target,
    message: e.message,
  });
});

// @ts-expect-error - Prisma internal typing for log emitter with adapter
db.$on("warn", (e: Prisma.LogEvent) => {
  logger.warn("Prisma Warning", { target: e.target, message: e.message });
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export const checkConnection = async (retries = 10, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await db.$connect();
      // Execute a real query to verify the connection is actually alive
      await db.$executeRaw`SELECT 1`;
      logger.info("✅ Database connected successfully");
      return;
    } catch (error) {
      if (i === retries - 1) {
        logger.error("❌ Database connection failed after retries", {
          error,
        });
        process.exit(1);
      }
      logger.warn(
        `Database connection failed, retrying in ${delay}ms... (${i + 1}/${retries})`
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }
};
