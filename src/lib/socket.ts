import { io, type Socket } from "socket.io-client";
import { env } from "~/env";

/**
 * Creates a new Socket.IO client connected to the backend.
 *
 * Backend mounts Socket.IO at `/socket.io/*` (see `internal/server/router.go`).
 * We create a fresh socket per page/session so we can safely disconnect/cleanup.
 */
export function createSocket(): Socket {
  return io(env.NEXT_PUBLIC_API_URL, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
  });
}

