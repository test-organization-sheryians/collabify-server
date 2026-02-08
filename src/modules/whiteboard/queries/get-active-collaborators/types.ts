import { z } from "zod";
import { getActiveCollaboratorsSchema } from "./schema";

export type GetActiveCollaboratorsInput = z.infer<
  typeof getActiveCollaboratorsSchema
>;

export type ActiveCollaborator = {
  userId: string;
  connectionId: string;
  joinedAt: Date;
  lastSeenAt: Date;
  cursorPosition: {
    x: number;
    y: number;
  } | null;
};
