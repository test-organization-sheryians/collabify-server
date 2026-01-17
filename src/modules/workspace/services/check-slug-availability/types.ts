import { z } from "zod";
import { CheckAvailabilitySchema } from "./schema";

export type CheckAvailabilityInput = z.infer<typeof CheckAvailabilitySchema>;
