import { z } from "zod";
import { updateBoardDescriptionSchema } from "./schema";

export type UpdateBoardDescriptionInput = z.infer<
  typeof updateBoardDescriptionSchema
>;
