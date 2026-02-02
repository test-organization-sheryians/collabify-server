import { z } from "zod";
import { deleteDmSchema } from "./schema";

export type DeleteDmInput = z.infer<typeof deleteDmSchema>;

export type DeleteDmOutput = {
  success: boolean;
  dmId: string;
};
