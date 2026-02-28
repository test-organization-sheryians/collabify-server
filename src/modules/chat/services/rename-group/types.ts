import { z } from "zod";
import { renameGroupSchema } from "./schema";

export type RenameGroupInput = z.infer<typeof renameGroupSchema>;

export type RenameGroupOutput = {
  success: boolean;
  groupId: string;
  name: string;
};
