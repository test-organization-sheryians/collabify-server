import type { z } from "zod";
import type { getUsersByIdsSchema } from "./schema";

export type GetUsersByIdsInput = z.infer<typeof getUsersByIdsSchema>;
