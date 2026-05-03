import { z } from "zod";
import { addBoardCollaboratorsSchema } from "./schema";

export type AddBoardCollaboratorsInput = z.infer<
  typeof addBoardCollaboratorsSchema
>;

export type AddBoardCollaboratorsResult = {
  success: boolean;
  addedCount: number;
  skippedCount: number;
};
