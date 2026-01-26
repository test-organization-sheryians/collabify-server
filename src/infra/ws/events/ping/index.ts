import { RouteDefinition } from "../../types";
import { pingHandler } from "./handler";
import { pingSchema } from "./schema";

export const ping: RouteDefinition = {
  schema: pingSchema as any,
  handler: pingHandler,
};
