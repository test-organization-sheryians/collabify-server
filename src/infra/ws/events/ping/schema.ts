import { z } from "zod";

export const pingSchema = z.object({}).optional();

export type PingInput = z.infer<typeof pingSchema>;
