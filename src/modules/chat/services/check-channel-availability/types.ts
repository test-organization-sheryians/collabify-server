import { z } from "zod";
import { CheckChannelAvailabilitySchema } from "./schema";

export type CheckChannelAvailabilityInput = z.infer<
  typeof CheckChannelAvailabilitySchema
>;

export type ChannelAvailabilityResponse = {
  available: boolean;
  message?: string;
  reason?: string;
  reservationId?: string | null;
};
