import { z } from "zod";
import { getSubscribedChannelsSchema } from "./schema";

export type GetSubscribedChannelsInput = z.infer<
  typeof getSubscribedChannelsSchema
>;
