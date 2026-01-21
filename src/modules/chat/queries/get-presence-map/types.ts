import { z } from "zod";
import { getPresenceMapSchema } from "./schema";

export type GetPresenceMapInput = z.infer<typeof getPresenceMapSchema>;
