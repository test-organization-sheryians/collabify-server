import { Resolvers } from "@/graphql/generated";
import { syncUser, SyncUserSchema } from "../../services";
import { getMe, GetMeSchema } from "../../queries";

export const resolvers: Resolvers = {
  Query: {
    me: async (_root, _args, ctx) => {
      const userId = ctx.auth.userId;
      if (!userId) {
        return null;
      }
      const data = GetMeSchema.parse({ userId });
      return getMe(data, ctx);
    },
  },
  Mutation: {
    syncUser: async (_root, args, ctx) => {
      const data = SyncUserSchema.parse(args);
      return syncUser(data, ctx);
    },
  },
};
