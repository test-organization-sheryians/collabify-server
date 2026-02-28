import { z } from "zod";
import { unsubscribeThreadSchema } from "./schema";

export type UnsubscribeThreadInput = z.infer<typeof unsubscribeThreadSchema>;

export type UnsubscribeThreadOutput = {
  success: boolean;
  threadId: string;
  isSubscribed: boolean;
};
