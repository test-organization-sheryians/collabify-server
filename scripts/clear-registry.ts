import { appRedis } from "../src/infra/redis";
import { createLogger } from "../src/shared/lib/logger";

const logger = createLogger("scripts:clear-registry");

const main = async () => {
  logger.info("Performing Nuclear Reset (FLUSHDB)...");

  await appRedis.flushdb();

  logger.info("Redis Flushed. Clean State.");
  process.exit(0);
};

main();
