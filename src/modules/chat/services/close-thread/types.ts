import { z } from "zod";
import { closeThreadSchema } from "./schema";

export type CloseThreadInput = z.infer<typeof closeThreadSchema>;

export type CloseThreadOutput = {
  success: boolean;
  threadId: string;
  closedAt: Date;
};
