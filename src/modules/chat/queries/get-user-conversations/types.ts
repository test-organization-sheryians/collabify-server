import { z } from "zod";
import { getUserConversationsSchema } from "./schema";
import type { Conversation } from "@/graphql/generated";

export type GetUserConversationsInput = z.infer<
  typeof getUserConversationsSchema
>;

export type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

export type GetUserConversationsOutput = {
  edges: Conversation[];
  pageInfo: PageInfo;
};
