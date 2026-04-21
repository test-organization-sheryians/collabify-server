import { Hono } from "hono";
import webhooksApp from "./webhooks";

const webhookRouter = new Hono();

webhookRouter.route("/api/webhooks", webhooksApp);

export default webhookRouter;