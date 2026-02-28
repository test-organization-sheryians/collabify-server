import { z } from "zod";
import { addChannelMembersSchema } from "./schema";

export type AddChannelMembersInput = z.infer<typeof addChannelMembersSchema>;

export type AddChannelMembersOutput = {
  success: boolean;
  addedCount: number;
  skippedCount: number; // Already members
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
