import { z } from "zod";
import { GetUnreadCountSchema } from "./schema";

export type GetUnreadCountInput = z.infer<typeof GetUnreadCountSchema>;
