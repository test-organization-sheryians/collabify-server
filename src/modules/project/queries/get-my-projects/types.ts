import { z } from "zod";
import { GetMyProjectsSchema } from "./schema";

export type GetMyProjectsInput = z.infer<typeof GetMyProjectsSchema>;
