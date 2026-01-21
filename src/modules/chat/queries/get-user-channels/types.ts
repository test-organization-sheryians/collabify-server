import { z } from "zod";
import { getUserChannelsSchema } from "./schema";

export type GetUserChannelsInput = z.infer<typeof getUserChannelsSchema>;
