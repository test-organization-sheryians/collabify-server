import { boardUpdateHandler } from "./handler";
import { boardUpdateSchema } from "./schema";

export const boardUpdate = {
  handler: boardUpdateHandler,
  schema: boardUpdateSchema,
};
