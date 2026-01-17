import { z } from "zod";
import { MarkNotificationReadSchema } from "./schema";

export type MarkNotificationReadInput = z.infer<
  typeof MarkNotificationReadSchema
>;
