import { z } from "zod";
import { RemoveMemberSchema } from "./schema";

export type RemoveMemberInput = z.infer<typeof RemoveMemberSchema>;
