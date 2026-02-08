import { requestSnapshotHandler } from "./handler";
import { requestSnapshotSchema } from "./schema";

export const requestSnapshot = {
  handler: requestSnapshotHandler,
  schema: requestSnapshotSchema,
};
