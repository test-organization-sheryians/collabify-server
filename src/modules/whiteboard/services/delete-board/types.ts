import { z } from "zod";
import { deleteBoardSchema } from "./schema";

export type DeleteBoardInput = z.infer<typeof deleteBoardSchema>;

export type DeleteBoardResult = {
  success: boolean;
  boardId: string;
};
