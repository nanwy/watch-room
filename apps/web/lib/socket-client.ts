import { io, type Socket } from "socket.io-client"

export function createRoomSocket(): Socket {
  const url = process.env.NEXT_PUBLIC_REALTIME_URL
  if (!url) throw new Error("NEXT_PUBLIC_REALTIME_URL is not configured")
  return io(url, {
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })
}
