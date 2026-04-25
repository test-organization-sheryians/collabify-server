import { z } from "zod";
import { DeclineWorkspaceInviteSchema } from "./schema";

export type DeclineWorkspaceInviteInput = z.infer<typeof DeclineWorkspaceInviteSchema>;
