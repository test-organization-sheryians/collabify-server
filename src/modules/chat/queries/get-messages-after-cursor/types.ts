import { z } from "zod";
import { getMessagesAfterCursorSchema } from "./schema";

export type GetMessagesAfterCursorInput = z.infer<
  typeof getMessagesAfterCursorSchema
>;
