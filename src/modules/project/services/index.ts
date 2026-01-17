import { CreateProjectTypeDefs } from "./create-project";
import { CheckSlugAvailabilityTypeDefs } from "./check-slug-availability";

export const typeDefs = [
  CreateProjectTypeDefs,
  CheckSlugAvailabilityTypeDefs,
].join("\n");

export * from "./create-project";
export * from "./check-slug-availability";
