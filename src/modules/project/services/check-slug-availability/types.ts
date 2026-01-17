import { z } from "zod";
import { CheckSlugAvailabilitySchema } from "./schema";

export type CheckSlugAvailabilityInput = z.infer<
  typeof CheckSlugAvailabilitySchema
>;

export interface AvailabilityResponse {
  available: boolean;
  message?: string;
  reason?: string;
  reservationId?: string;
}
