import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
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

// @ts-ignore - Prisma types for events are tricky with the adapter setup sometimes
db.$on("query", (e: any) => {
  if (env.NODE_ENV === "development") {
    const payload: any = {
      msg: "Prisma Query",
      query: e.query,
      duration: `${e.duration}ms`,
    };
    if (env.LOG_DB_PARAMS) {
      payload.params = e.params;
    }
    logger.debug(payload);
  }
});

// @ts-ignore
db.$on("error", (e: any) => {
  logger.error({
    msg: "Prisma Error",
    target: e.target,
    message: e.message,
  });
});

// @ts-ignore
db.$on("info", (e: any) => {
  logger.info({
    msg: "Prisma Info",
    message: e.message,
  });
});

// @ts-ignore
db.$on("warn", (e: any) => {
  logger.warn({
    msg: "Prisma Warning",
    message: e.message,
  });
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export const checkConnection = async () => {
  try {
    await db.$connect();
    // Execute a real query to verify the connection is actually alive
    await db.$executeRaw`SELECT 1`;
    logger.info("✅ Database connected successfully");
  } catch (error) {
    logger.error({
      msg: "❌ Database connection failed",
      error,
    });
    process.exit(1);
  }
};
