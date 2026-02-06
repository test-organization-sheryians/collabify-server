import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { env } from "../shared/config/env";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const connectionString = env.DATABASE_URL;

import { logger } from "../shared/logger";

const pool = new Pool({ connectionString });
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

  const payload = {
    msg: "DB Query",
    query: e.query,
    duration: `${e.duration}ms`,
    params: env.LOG_DB_PARAMS ? e.params : undefined,
  };
  logger.debug(payload);
});

// @ts-expect-error - Prisma internal typing for log emitter with adapter
db.$on("error", (e: Prisma.LogEvent) => {
  logger.error({ target: e.target, message: e.message }, "Prisma Error");
});

// @ts-expect-error - Prisma internal typing for log emitter with adapter
db.$on("info", (e: Prisma.LogEvent) => {
  logger.info(
    {
      target: e.target,
      message: e.message,
    },
    "Prisma Info"
  );
});

// @ts-expect-error - Prisma internal typing for log emitter with adapter
db.$on("warn", (e: Prisma.LogEvent) => {
  logger.warn({ target: e.target, message: e.message }, "Prisma Warning");
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
        logger.error({
          msg: "❌ Database connection failed after retries",
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
