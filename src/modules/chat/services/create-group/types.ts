import { ChatConversation } from "@prisma/client";
import { createGroupInputSchema } from "./schema";
import { z } from "zod";

export type CreateGroupInput = z.infer<typeof createGroupInputSchema>;
export type CreateGroupOutput = ChatConversation;
