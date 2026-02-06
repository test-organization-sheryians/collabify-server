import { z } from "zod";
import { addGroupMembersSchema } from "./schema";

export type AddGroupMembersInput = z.infer<typeof addGroupMembersSchema>;

export type AddGroupMembersOutput = {
  success: boolean;
  addedCount: number;
  skippedCount: number;
  members: {
    userId: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      avatarUrl: string | null;
    };
  }[];
};
