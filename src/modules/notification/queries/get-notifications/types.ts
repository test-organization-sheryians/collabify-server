import { z } from "zod";
import { GetNotificationsSchema } from "./schema";
import { Notification } from "@prisma/client";

export type GetNotificationsInput = z.infer<typeof GetNotificationsSchema>;

export interface GetNotificationsResult {
  items: Notification[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}
