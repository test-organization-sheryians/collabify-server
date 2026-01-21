import { z } from "zod";
import { getMessageByIdSchema } from "./schema";

export type GetMessageByIdInput = z.infer<typeof getMessageByIdSchema>;
