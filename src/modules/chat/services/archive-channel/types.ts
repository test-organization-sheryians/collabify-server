import { z } from "zod";
import { archiveChannelSchema } from "./schema";

export type ArchiveChannelInput = z.infer<typeof archiveChannelSchema>;
