import { z } from "zod";
import { renameChannelSchema } from "./schema";

export type RenameChannelInput = z.infer<typeof renameChannelSchema>;
