import { z } from "zod";
import { removeBoardCollaboratorSchema } from "./schema";

export type RemoveBoardCollaboratorInput = z.infer<
  typeof removeBoardCollaboratorSchema
>;

export type RemoveBoardCollaboratorResult = {
  success: boolean;
};
