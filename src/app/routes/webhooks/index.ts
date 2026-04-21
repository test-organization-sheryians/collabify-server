import { Hono } from "hono";
import { clerkWebhookRoutes } from "./providers/clerk";

const webhooksApp = new Hono();

webhooksApp.route("/clerk", clerkWebhookRoutes);

export default webhooksApp;