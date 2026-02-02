import { z } from "zod";
import { subscribeThreadSchema } from "./schema";

export type SubscribeThreadInput = z.infer<typeof subscribeThreadSchema>;

export type SubscribeThreadOutput = {
  success: boolean;
  threadId: string;
  isSubscribed: boolean;
};
