import { z } from "zod";
import { UpdateMemberRoleSchema } from "./schema";

export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;
