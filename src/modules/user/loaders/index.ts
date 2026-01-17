import { createUserByIdLoader } from "./user-by-id.loader";

export const createUserLoaders = () => ({
  userById: createUserByIdLoader(),
});

export type UserLoaders = ReturnType<typeof createUserLoaders>;
