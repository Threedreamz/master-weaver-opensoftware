import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";

export interface RealtimeServerOptions {
  httpServer: HttpServer;
  corsOrigins?: string[];
  path?: string;
}

export function createRealtimeServer(opts: RealtimeServerOptions): SocketIOServer {
  const io = new SocketIOServer(opts.httpServer, {
    path: opts.path ?? "/socket.io",
    cors: {
      origin: opts.corsOrigins ?? "*",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("subscribe", (channelId: string) => {
      socket.join(`channel:${channelId}`);
    });
    socket.on("unsubscribe", (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });
  });

  return io;
}

export function broadcastToChannel(
  io: SocketIOServer,
  channelId: string,
  event: string,
  payload: unknown,
): void {
  io.to(`channel:${channelId}`).emit(event, payload);
}
