import { subscribeThreadHandler } from "./handler";
import { subscribeThreadSchema } from "./schema";

export const subscribeThread = {
  handler: subscribeThreadHandler,
  schema: subscribeThreadSchema,
};
