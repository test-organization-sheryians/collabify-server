import { z } from "zod";
import { GetInviteInfoSchema } from "./schema";

export type GetInviteInfoInput = z.infer<typeof GetInviteInfoSchema>;
