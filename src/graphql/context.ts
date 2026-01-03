import { getAuth } from "@hono/clerk-auth";
import { Context } from "hono";

export interface GraphQLContext {
  auth: {
    userId: string | null;
    sessionId: string | null;
  };
}

export const createContext = (c: Context): GraphQLContext => {
  const auth = getAuth(c);

  return {
    auth: {
      userId: auth?.userId || null,
      sessionId: auth?.sessionId || null,
    },
  };
};
