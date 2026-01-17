import { z } from "zod";
import { MarkAllNotificationsReadSchema } from "./schema";

export type MarkAllNotificationsReadInput = z.infer<
  typeof MarkAllNotificationsReadSchema
>;
