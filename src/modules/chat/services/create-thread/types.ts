import { z } from "zod";
import { createThreadInputSchema } from "./schema";
import type { ChatConversation } from "@prisma/client";

export type CreateThreadInput = z.infer<typeof createThreadInputSchema>;

// Return full Conversation type for GraphQL compatibility
export type CreateThreadOutput = ChatConversation;
