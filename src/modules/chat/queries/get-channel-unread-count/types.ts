import { z } from "zod";
import { getChannelUnreadCountSchema } from "./schema";

export type GetChannelUnreadCountInput = z.infer<
  typeof getChannelUnreadCountSchema
>;
