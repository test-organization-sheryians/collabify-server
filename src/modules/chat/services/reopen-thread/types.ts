import { z } from "zod";
import { reopenThreadSchema } from "./schema";

export type ReopenThreadInput = z.infer<typeof reopenThreadSchema>;

export type ReopenThreadOutput = {
  success: boolean;
  threadId: string;
};
