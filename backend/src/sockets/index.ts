import { Server } from "socket.io";
import { registerTicToeSocket } from "./tick_toe.socket";
import { registerChatSocket } from "./chat.socket";
export function registerSockets(io: Server) {
 // registerTicToeSocket(io);
  registerChatSocket(io);
}