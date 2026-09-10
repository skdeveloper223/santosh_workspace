// No "server-only" guard here (deliberately): this module is also imported
// by realtime-gateway/index.ts, a standalone Node process outside Next.js's
// bundler — the guard throws unconditionally there, since it can only detect
// "am I in Next's server compilation" not "am I in Node generally".
import { createServer, type Server as HttpServer } from "node:http";
import { Server as SocketIoServer, type Socket } from "socket.io";
import { verifySupabaseToken } from "./auth";
import { canJoinRoom } from "./permissions";
import { subscribeFanout } from "./fanout";
import type { RealtimeIdentity, RealtimeScope } from "./types";

export type VerifyTokenFn = (token: string) => Promise<RealtimeIdentity | null>;
export type CanJoinRoomFn = (userId: string, companyId: string, scope: RealtimeScope, id: string) => Promise<boolean>;

export type RealtimeGatewayOptions = {
  port: number;
  /** Overridable for tests — production always uses the real Supabase-backed checks. */
  verifyToken?: VerifyTokenFn;
  canJoinRoom?: CanJoinRoomFn;
};

export type RealtimeGateway = {
  io: SocketIoServer;
  httpServer: HttpServer;
  close: () => Promise<void>;
};

function roomName(scope: RealtimeScope, id: string): string {
  return `${scope}:${id}`;
}

/** §7.9 tasks 1–2 — the standalone Socket.IO process bridging Redis pub/sub to scoped rooms. Never talked to directly by hardware-engine; only via publishFanout(). */
export function startRealtimeGateway(options: RealtimeGatewayOptions): RealtimeGateway {
  const verify = options.verifyToken ?? verifySupabaseToken;
  const authorize = options.canJoinRoom ?? canJoinRoom;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const httpServer = createServer();
  const io = new SocketIoServer(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing auth token"));
    const identity = await verify(token);
    if (!identity) return next(new Error("Invalid or expired session"));
    socket.data.identity = identity;
    next();
  });

  io.on("connection", (socket: Socket) => {
    const identity = socket.data.identity as RealtimeIdentity;

    socket.on(
      "subscribe",
      async ({ scope, id }: { scope: RealtimeScope; id: string }, ack?: (allowed: boolean) => void) => {
        const allowed = await authorize(identity.userId, identity.companyId, scope, id);
        if (allowed) socket.join(roomName(scope, id));
        ack?.(allowed);
      },
    );

    socket.on("unsubscribe", ({ scope, id }: { scope: RealtimeScope; id: string }) => {
      socket.leave(roomName(scope, id));
    });
  });

  const stopFanoutSubscription = subscribeFanout((message) => {
    for (const target of message.targets) {
      io.to(roomName(target.scope, target.id)).emit(message.event, message.payload);
    }
  });

  httpServer.listen(options.port, () => {
    console.log(`[realtime-gateway] listening on :${options.port}`);
  });

  return {
    io,
    httpServer,
    close: () =>
      new Promise((resolve) => {
        stopFanoutSubscription();
        io.close(() => httpServer.close(() => resolve()));
      }),
  };
}
