import { z } from "zod";

export const getReadReceiptsSchema = z.object({
  messageId: z.string().min(1),
});

export type GetReadReceiptsInput = z.infer<typeof getReadReceiptsSchema>;

export interface ReadReceiptsOutput {
  readBy: Array<{
    userId: string;
    username: string;
    avatarUrl: string | null;
  }>;
  totalReads: number;
  totalMembers: number;
}
