import { ChatConversation } from "@prisma/client";
import { createDmInputSchema } from "./schema";
import { z } from "zod";

export type CreateDmInput = z.infer<typeof createDmInputSchema>;
export type CreateDmOutput = ChatConversation;
