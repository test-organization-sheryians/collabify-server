import { subscribeBoardHandler } from "./handler";
import { subscribeBoardSchema } from "./schema";

export const subscribeBoard = {
  handler: subscribeBoardHandler,
  schema: subscribeBoardSchema,
};
