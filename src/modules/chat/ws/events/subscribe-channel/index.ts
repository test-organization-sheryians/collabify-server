import { subscribeChannelHandler } from "./handler";
import { subscribeChannelSchema } from "./schema";

export const subscribeChannel = {
  handler: subscribeChannelHandler,
  schema: subscribeChannelSchema,
};
