import { ChatWebSocket, createSuccessFrame } from "../../types";
import { Context } from "hono";
import { PingInput } from "./schema";

export const pingHandler = (
  _ctx: Context,
  socket: ChatWebSocket,
  _input: PingInput
) => {
  socket.send(createSuccessFrame(undefined, "pong", {}));
};
