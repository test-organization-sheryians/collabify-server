import { Hono } from "hono";
import { createYoga } from "graphql-yoga";
import { schema } from "../graphql/schema";

const app = new Hono();

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
});

// Mount Yoga on the /graphql endpoint
app.use("/graphql", async (c) => {
  return yoga.fetch(c.req.raw, app, c);
});

// Hello World route
app.get("/", (c) => {
  return c.text("Collabify Server is running!");
});

export default {
  port: 3001,
  fetch: app.fetch,
};
