import { schema } from "@/graphql/schema";
import { printSchema } from "graphql";
import * as fs from "fs";
import * as path from "path";

const SCHEMA_PATH = path.join(__dirname, "../../schema.graphql");

const run = () => {
  try {
    const sdl = printSchema(schema);
    fs.writeFileSync(SCHEMA_PATH, sdl);
    // eslint-disable-next-line no-console
    console.log(`Schema generated at ${SCHEMA_PATH}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

run();
