import { subscribePageHandler } from "./handler";
import { subscribePageSchema } from "./schema";

export const subscribePage = {
  handler: subscribePageHandler,
  schema: subscribePageSchema,
};
