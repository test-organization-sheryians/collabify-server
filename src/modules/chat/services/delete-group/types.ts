import { z } from "zod";
import { deleteGroupSchema } from "./schema";

export type DeleteGroupInput = z.infer<typeof deleteGroupSchema>;

export type DeleteGroupOutput = {
  success: boolean;
  groupId: string;
};
