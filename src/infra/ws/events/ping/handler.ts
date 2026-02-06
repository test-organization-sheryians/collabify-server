import {
  WSHandlerContext,
  GenericWebSocket,
  createSuccessFrame,
} from "../../core/types";
import { PingInput } from "./schema";

export const pingHandler = (
  _ctx: WSHandlerContext,
  socket: GenericWebSocket,
  _input: PingInput
) => {
  socket.send(createSuccessFrame(undefined, "pong", {}));
};
