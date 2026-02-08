import { z } from "zod";
import { getBoardCollaboratorsSchema } from "./schema";

export type GetBoardCollaboratorsInput = z.infer<
  typeof getBoardCollaboratorsSchema
>;

export type BoardCollaborator = {
  userId: string;
  joinedAt: Date;
  user: {
    id: string;
    fullName: string; // Non-null after handler transformation
    email: string;
    avatarUrl: string | null;
  };
};
