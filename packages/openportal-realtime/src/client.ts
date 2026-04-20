import { io, type Socket } from "socket.io-client";

export interface RealtimeClientOptions {
  url: string;
  workspaceId: string;
  getAuthToken?: () => string | Promise<string>;
}

export async function connectRealtime(opts: RealtimeClientOptions): Promise<Socket> {
  const token = opts.getAuthToken ? await opts.getAuthToken() : undefined;
  return io(opts.url, {
    transports: ["websocket"],
    auth: {
      token,
      workspaceId: opts.workspaceId,
    },
  });
}
