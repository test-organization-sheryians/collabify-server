import { z } from "zod";
import { getDmByUsersSchema } from "./schema";
import { ConversationType } from "@/graphql/generated";

export type GetDmByUsersInput = z.infer<typeof getDmByUsersSchema>;

export type GetDmByUsersOutput = {
  id: string;
  workspaceId: string;
  projectId: string;
  type: ConversationType;
  memberCount: number;
  members: {
    userId: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      avatarUrl: string | null;
    };
  }[];
  createdAt: Date;
  updatedAt: Date;
} | null; // Returns null if no DM exists
