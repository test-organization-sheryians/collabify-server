import { z } from "zod";
import { deleteThreadSchema } from "./schema";

export type DeleteThreadInput = z.infer<typeof deleteThreadSchema>;

export type DeleteThreadOutput = {
  success: boolean;
  threadId: string;
};
