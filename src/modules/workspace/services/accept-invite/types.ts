import { z } from "zod";
import { AcceptInviteSchema } from "./schema";

export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;
