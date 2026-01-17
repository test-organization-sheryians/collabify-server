import { z } from "zod";
import { InviteToWorkspaceSchema } from "./schema";

export type InviteToWorkspaceInput = z.infer<typeof InviteToWorkspaceSchema>;
