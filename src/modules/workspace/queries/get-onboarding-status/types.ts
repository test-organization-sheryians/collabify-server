import { z } from "zod";
import { GetOnboardingStatusSchema } from "./schema";

export type GetOnboardingStatusInput = z.infer<
  typeof GetOnboardingStatusSchema
>;
