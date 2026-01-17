import { z } from "zod";
import { CreateOnboardingWorkspaceSchema } from "./schema";

export type CreateOnboardingWorkspaceInput = z.infer<
  typeof CreateOnboardingWorkspaceSchema
>;
