import { ChatWebSocket, createSuccessFrame, WSHandlerContext } from "../../types";
import { PingInput } from "./schema";

export const pingHandler = (
  _ctx: WSHandlerContext,
  socket: ChatWebSocket,
  _input: PingInput
) => {
  socket.send(createSuccessFrame(undefined, "pong", {}));
};
