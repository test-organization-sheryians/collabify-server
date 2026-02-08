import { z } from "zod";
import { archiveBoardSchema } from "./schema";

export type ArchiveBoardInput = z.infer<typeof archiveBoardSchema>;
