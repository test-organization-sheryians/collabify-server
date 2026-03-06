import { z } from "zod";
import { getConversationSchema } from "./schema";
import type { Conversation } from "@/graphql/generated";

export type GetConversationInput = z.infer<typeof getConversationSchema>;

export type GetConversationOutput = Conversation;
