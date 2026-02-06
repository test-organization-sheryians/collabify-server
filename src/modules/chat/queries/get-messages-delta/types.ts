import { z } from "zod";
import { getMessagesDeltaSchema } from "./schema";

export type GetMessagesDeltaInput = z.infer<typeof getMessagesDeltaSchema>;
