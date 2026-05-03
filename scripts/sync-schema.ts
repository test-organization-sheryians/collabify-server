import { writeFileSync } from "node:fs";
import { printSchema } from "graphql";
import { schema } from "../src/graphql/schema";
import path from "node:path";

const CLIENT_SCHEMA_PATH = path.join(process.cwd(), "../client/schema.graphql");
// eslint-disable-next-line no-console
console.log(`🔄 Syncing GraphQL Schema to ${CLIENT_SCHEMA_PATH}...`);

try {
  const schemaAsString = printSchema(schema);
  writeFileSync(CLIENT_SCHEMA_PATH, schemaAsString);
  // eslint-disable-next-line no-console
  console.log("✅ GraphQL Schema synced successfully!");
  process.exit(0);
} catch (error) {
  console.error("❌ Failed to sync GraphQL Schema:", error);
  process.exit(1);
}
